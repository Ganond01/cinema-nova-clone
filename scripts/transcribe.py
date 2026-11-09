#!/usr/bin/env python3
"""
Автоматична транскрипція відео/аудіо у WebVTT (.vtt) за допомогою faster-whisper та Gemini AI.
Модель: large-v3-turbo
Параметри: device="cuda", compute_type="float16", language="uk", vad_filter=True (з автоматичним CPU/int8 фолбеком)
"""
import sys
import os
import glob
import subprocess
import json
import traceback
import urllib.request
import datetime
import site
import re

UKRAINIAN_INITIAL_PROMPT = (
    "Транскрипція української озвучки аніме Реінкарнація безробітного. "
    "Персонажі та терміни: Рудеус Грейрат, Рудеусу, Рудеуса, Еріс, Сільфіетта, "
    "Роксі, Пол, Лілія, Норн, Аіша, магія, заклинання."
)

def autocorrect_ukrainian_whisper_text(text: str) -> str:
    """Виправляє типові фонетичні ослушки Whisper в українській мові."""
    if not text:
        return ""
    replacements = [
        (r"\bРудус\b", "Рудеус"),
        (r"\bРудуса\b", "Рудеуса"),
        (r"\bРудусу\b", "Рудеусу"),
        (r"\bРудусом\b", "Рудеусом"),
        (r"\bрудус\b", "рудеус"),
        (r"\bрудуса\b", "рудеуса"),
        (r"\bрудусу\b", "рудеусу"),
        (r"\bрудусом\b", "рудеусом"),
    ]
    res = text
    for pattern, repl in replacements:
        res = re.sub(pattern, repl, res)
    return res

# 1. Налаштування UTF-8 кодування для Windows консолі та автоматичне підключення DLL (nvidia-cublas, torch, ctranslate2)
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

if sys.platform == "win32":
    try:
        sp_dirs = site.getsitepackages()
        if hasattr(site, "USER_SITE") and site.USER_SITE:
            sp_dirs.append(site.USER_SITE)
        for sp in sp_dirs:
            if not os.path.isdir(sp):
                continue
            for root, dirs, files in os.walk(sp):
                if any(f.lower().endswith(".dll") for f in files):
                    try:
                        os.add_dll_directory(root)
                    except Exception:
                        pass
                    if root not in os.environ.get("PATH", ""):
                        os.environ["PATH"] = root + os.path.pathsep + os.environ.get("PATH", "")
    except Exception as dll_err:
        sys.stderr.write(f"[DLL Notice] {dll_err}\n")

LOG_FILE_PATH = os.path.join(os.getcwd(), "public", "subtitles", "transcribe.log")

def log_status(msg: str):
    now_str = datetime.datetime.now().strftime("%H:%M:%S")
    formatted = f"[{now_str}] {msg}"
    sys.stderr.write(f"{formatted}\n")
    sys.stderr.flush()
    try:
        os.makedirs(os.path.dirname(LOG_FILE_PATH), exist_ok=True)
        with open(LOG_FILE_PATH, "a", encoding="utf-8") as f:
            f.write(f"{formatted}\n")
            f.flush()
    except Exception:
        pass

def format_vtt_timestamp(seconds: float) -> str:
    """Форматує секунди у стандартний часовий штамп WebVTT (HH:MM:SS.mmm)."""
    if seconds < 0:
        seconds = 0.0
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int(round((seconds % 1) * 1000))
    if millis >= 1000:
        secs += 1
        millis = 0
    if secs >= 60:
        minutes += 1
        secs = 0
    if minutes >= 60:
        hours += 1
        minutes = 0
    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{millis:03d}"

def write_vtt_file(segments, output_vtt_path):
    """Записує масив сегментів у файл WebVTT (.vtt)."""
    os.makedirs(os.path.dirname(output_vtt_path), exist_ok=True)
    with open(output_vtt_path, "w", encoding="utf-8") as f:
        f.write("WEBVTT\n\n")
        idx = 1
        for seg in segments:
            start = getattr(seg, 'start', None) if not isinstance(seg, dict) else seg.get('start')
            end = getattr(seg, 'end', None) if not isinstance(seg, dict) else seg.get('end')
            text = getattr(seg, 'text', None) if not isinstance(seg, dict) else seg.get('text')
            
            if start is None: start = 0.0
            if end is None: end = float(start) + 3.0
            if text is None: text = ""
            
            clean_text = autocorrect_ukrainian_whisper_text(str(text).strip())
            if not clean_text:
                continue

            f.write(f"{idx}\n")
            f.write(f"{format_vtt_timestamp(float(start))} --> {format_vtt_timestamp(float(end))}\n")
            f.write(f"{clean_text}\n\n")
            idx += 1

def resolve_input_media(input_media):
    """Розпізнає локальні шляхи та перетворює URL вигляду localhost/127.0.0.1 у дійсні файли на диску."""
    if not input_media:
        return ""
    if input_media.startswith("http://") or input_media.startswith("https://"):
        try:
            parsed = urllib.parse.urlparse(input_media)
            if "localhost" in parsed.netloc or "127.0.0.1" in parsed.netloc or "0.0.0.0" in parsed.netloc:
                clean_path = parsed.path.lstrip("/")
                cand_path = os.path.join(os.getcwd(), "public", clean_path)
                if os.path.exists(cand_path):
                    log_status(f"[Whisper.cpp] Resolved localhost URL to local file: {cand_path}")
                    return cand_path
        except Exception:
            pass
    elif input_media.startswith("/uploads/") or input_media.startswith("/videos/") or input_media.startswith("/subtitles/"):
        cand_path = os.path.join(os.getcwd(), "public", input_media.lstrip("/"))
        if os.path.exists(cand_path):
            return cand_path

    return input_media

def extract_audio_ffmpeg(input_media, output_wav):
    """Витягує аудіотрек у 16kHz WAV через FFmpeg."""
    resolved_media = resolve_input_media(input_media)
    log_status(f"[FFmpeg] Витягування аудіотреку 16kHz через FFmpeg з: {resolved_media}")
    try:
        cmd = ["ffmpeg", "-loglevel", "error", "-y"]
        if resolved_media.startswith("http://") or resolved_media.startswith("https://"):
            cmd.extend(["-headers", "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)\r\n"])
        cmd.extend([
            "-i", resolved_media,
            "-ar", "16000", "-ac", "1",
            "-c:a", "pcm_s16le",
            output_wav
        ])
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=300)
        if res.returncode == 0 and os.path.exists(output_wav) and os.path.getsize(output_wav) > 1000:
            log_status(f"[FFmpeg ✅] Аудіо успішно вилучено в 16kHz WAV: {output_wav}")
            return True
        else:
            log_status(f"[FFmpeg Notice] Попередження FFmpeg: {res.stderr.decode('utf-8', errors='ignore')}")
    except Exception as e:
        log_status(f"[FFmpeg Notice] FFmpeg exception: {e}")
    return False

def transcribe_with_gemini(wav_path, movie_title=""):
    """Автоматична транскрипція мовного потоку через Gemini AI Speech API якщо доступний GEMINI_API_KEY."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key or not os.path.exists(wav_path):
        return None

    try:
        log_status("[Gemini AI] Запуск аудіо-транскрипції мовлення Gemini Speech Model...")
        from google import genai
        client = genai.Client(api_key=api_key)
        
        with open(wav_path, "rb") as f:
            audio_bytes = f.read()

        prompt = f"""You are an expert speech recognition model. Transcribe all spoken dialogue from this audio track into synchronized subtitle segments.
Media Title: "{movie_title}".

Return ONLY a valid JSON array of objects with the exact format:
[
  {{ "start": 1.0, "end": 4.5, "text": "Spoken sentence..." }},
  {{ "start": 5.0, "end": 9.2, "text": "Next sentence..." }}
]
Do not wrap in markdown tags or backticks. Return strictly the JSON array."""

        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[
                genai.types.Part.from_bytes(data=audio_bytes, mime_type='audio/wav'),
                prompt
            ]
        )

        raw = response.text or ''
        cleaned = raw.replace('```json', '').replace('```', '').strip()
        parsed = json.loads(cleaned)
        if isinstance(parsed, list) and len(parsed) > 0:
            log_status(f"[Gemini AI ✅] Розпізнано та синхронізовано {len(parsed)} мовних сегментів!")
            return parsed
    except Exception as gem_err:
        log_status(f"[Gemini AI Notice] Помилка Gemini API: {gem_err}")
    return None

def load_whisper_models():
    """Завантажує модель транскрипції з пріоритетом faster-whisper та автоматичним фолбеком GPU (CUDA) -> CPU (int8)."""
    # 1. Пріоритет: faster-whisper (large-v3-turbo, small, base)
    try:
        from faster_whisper import WhisperModel
        model_candidates = ["large-v3-turbo", "small", "base"]

        # 1a. Спроба GPU (CUDA)
        for m_id in model_candidates:
            try:
                log_status(f"[faster-whisper GPU] Спроба ініціалізації моделі '{m_id}' (device='cuda', compute_type='float16')...")
                model = WhisperModel(m_id, device="cuda", compute_type="float16")
                log_status(f"✅ [faster-whisper GPU Success] Модель '{m_id}' успішно завантажена на GPU (CUDA float16)!")
                return ["faster-whisper", model, m_id, "cuda"]
            except Exception as cuda_err:
                log_status(f"⚠️ [faster-whisper GPU Error] CUDA помилка для '{m_id}': {cuda_err}")

        log_status("⚡ [faster-whisper Auto Fallback] GPU недоступний або сталася помилка DLL/CUDA. Перехід на CPU (device='cpu', compute_type='int8')...")

        # 1b. Спроба CPU (int8)
        for m_id in model_candidates:
            try:
                log_status(f"[faster-whisper CPU] Спроба ініціалізації моделі '{m_id}' (device='cpu', compute_type='int8')...")
                model = WhisperModel(m_id, device="cpu", compute_type="int8")
                log_status(f"✅ [faster-whisper CPU Success] Модель '{m_id}' завантажена на CPU (int8)!")
                return ["faster-whisper", model, m_id, "cpu"]
            except Exception as cpu_err:
                log_status(f"⚠️ [faster-whisper CPU Notice] Помилка CPU '{m_id}': {cpu_err}")

    except ImportError:
        log_status("[faster-whisper Notice] Пакет 'faster-whisper' відсутній у середовищі.")

    # 2. Фолбек на openai-whisper якщо faster-whisper відсутній
    try:
        import whisper
        try:
            log_status("[openai-whisper GPU] Спроба моделі 'base' (device='cuda')...")
            model = whisper.load_model("base", device="cuda")
            log_status("✅ [openai-whisper GPU Success] Завантажено на GPU!")
            return ["openai-whisper", model, "base", "cuda"]
        except Exception as o_cuda_err:
            log_status(f"⚠️ [openai-whisper GPU Notice] {o_cuda_err}. Перехід на CPU...")

        log_status("[openai-whisper CPU] Завантаження 'base' на CPU...")
        model = whisper.load_model("base", device="cpu")
        log_status("✅ [openai-whisper CPU Success] Завантажено 'base' на CPU!")
        return ["openai-whisper", model, "base", "cpu"]
    except Exception as err:
        log_status(f"[openai-whisper Notice] openai-whisper недоступний: {err}")

    return [None, None, None, None]

def transcribe_single_file(engine_info, media_path, out_vtt_path):
    """Транскрибує один медіафайл і зберігає VTT субтитри та sidecar JSON транскрипт."""
    log_status(f"[Whisper] Старт транскрипції: {media_path}")
    log_status(f"[Whisper] Цільовий файл VTT: {out_vtt_path}")

    if not engine_info or engine_info[1] is None:
        engine_type, model, model_name, device_type = None, None, None, None
    else:
        engine_type, model, model_name, device_type = engine_info[0], engine_info[1], engine_info[2], engine_info[3]

    resolved_path = resolve_input_media(media_path)
    
    out_json_path = out_vtt_path.replace(".vtt", "").replace("_whisper", "") + "_transcript.json"

    raw_segments = []

    # 1. Використання faster-whisper (з можливістю фолбеку під час виконання)
    if engine_type == "faster-whisper" and model is not None:
        try:
            log_status(f"[faster-whisper {device_type.upper()}] Запуск розпізнавання мови для: {resolved_path} (language='uk', word_timestamps=True, max_new_tokens=128)...")
            segments_fw, info = model.transcribe(
                resolved_path,
                language="uk",
                initial_prompt=UKRAINIAN_INITIAL_PROMPT,
                word_timestamps=True,
                vad_filter=True,
                vad_parameters=dict(min_silence_duration_ms=600, speech_pad_ms=200),
                max_new_tokens=128,
                beam_size=5
            )
            for seg in segments_fw:
                txt = autocorrect_ukrainian_whisper_text(str(seg.text).strip())
                if txt:
                    raw_segments.append({
                        "start": round(float(seg.start), 2),
                        "end": round(float(seg.end), 2),
                        "start_seconds": round(float(seg.start), 2),
                        "end_seconds": round(float(seg.end), 2),
                        "text": txt
                    })
            log_status(f"[faster-whisper ✅] Успішно розпізнано {len(raw_segments)} мовних сегментів!")
        except Exception as e:
            log_status(f"⚠️ [faster-whisper {device_type.upper()} Execution Error] Помилка виконання: {e}\n{traceback.format_exc()}")
            
            # Якщо виникла помилка під час роботи на GPU (наприклад відсутність CUDA DLL під час transcribe), виконуємо фолбек на CPU
            if device_type == "cuda":
                log_status("⚡ [Auto CPU Fallback] Перехоплено помилку GPU/CUDA під час виконання! Перемикаємось на CPU (device='cpu', compute_type='int8')...")
                try:
                    from faster_whisper import WhisperModel
                    cpu_candidates = [model_name, "large-v3-turbo", "small", "base"] if model_name else ["large-v3-turbo", "small", "base"]
                    cpu_model = None
                    used_name = None
                    for cand in cpu_candidates:
                        if not cand:
                            continue
                        try:
                            log_status(f"[faster-whisper CPU Fallback] Спроба ініціалізації '{cand}' (device='cpu', compute_type='int8')...")
                            cpu_model = WhisperModel(cand, device="cpu", compute_type="int8")
                            used_name = cand
                            log_status(f"✅ [faster-whisper CPU Fallback Success] Модель '{cand}' завантажена на CPU!")
                            break
                        except Exception as c_err:
                            log_status(f"⚠️ [faster-whisper CPU Fallback Error] Не вдалося завантажити '{cand}' на CPU: {c_err}")

                    if cpu_model is not None:
                        # Оновлюємо engine_info для наступних файлів у пакеті
                        engine_info[1] = cpu_model
                        engine_info[2] = used_name
                        engine_info[3] = "cpu"

                        log_status(f"[faster-whisper CPU] Повторний запуск розпізнавання для: {resolved_path}...")
                        segments_fw, info = cpu_model.transcribe(
                            resolved_path,
                            language="uk",
                            initial_prompt=UKRAINIAN_INITIAL_PROMPT,
                            word_timestamps=True,
                            vad_filter=True,
                            vad_parameters=dict(min_silence_duration_ms=600, speech_pad_ms=200),
                            max_new_tokens=128,
                            beam_size=5
                        )
                        raw_segments.clear()
                        for seg in segments_fw:
                            txt = autocorrect_ukrainian_whisper_text(str(seg.text).strip())
                            if txt:
                                raw_segments.append({
                                    "start": round(float(seg.start), 2),
                                    "end": round(float(seg.end), 2),
                                    "start_seconds": round(float(seg.start), 2),
                                    "end_seconds": round(float(seg.end), 2),
                                    "text": txt
                                })
                        log_status(f"[faster-whisper CPU ✅] Повторна транскрипція на CPU успішна! Розпізнано {len(raw_segments)} мовних сегментів!")
                except Exception as cpu_exec_err:
                    log_status(f"❌ [faster-whisper CPU Fallback Failure] Помилка повторного виконання на CPU: {cpu_exec_err}\n{traceback.format_exc()}")

    # 2. Фолбек на openai-whisper
    if len(raw_segments) == 0 and engine_type == "openai-whisper" and model is not None:
        try:
            log_status(f"[openai-whisper] Запуск розпізнавання мови для: {resolved_path}...")
            result = model.transcribe(resolved_path, language="uk", initial_prompt=UKRAINIAN_INITIAL_PROMPT, verbose=False)
            segs = result.get("segments", [])
            for seg in segs:
                txt = autocorrect_ukrainian_whisper_text(str(seg.get("text", "")).strip())
                if txt:
                    raw_segments.append({
                        "start": round(float(seg.get("start", 0)), 2),
                        "end": round(float(seg.get("end", 0)), 2),
                        "start_seconds": round(float(seg.get("start", 0)), 2),
                        "end_seconds": round(float(seg.get("end", 0)), 2),
                        "text": txt
                    })
            log_status(f"[openai-whisper ✅] Успішно розпізнано {len(raw_segments)} мовних сегментів!")
        except Exception as e:
            log_status(f"[openai-whisper Error] Помилка: {e}\n{traceback.format_exc()}")

    # 3. Якщо є розпізнані сегменти -> зберігаємо І JSON, І VTT субтитри
    if len(raw_segments) > 0:
        try:
            os.makedirs(os.path.dirname(out_json_path), exist_ok=True)
            with open(out_json_path, "w", encoding="utf-8") as f_json:
                json.dump(raw_segments, f_json, ensure_ascii=False, indent=2)
            log_status(f"[JSON Transcript ✅] Збережено транскрипт у JSON: {out_json_path}")
        except Exception as j_err:
            log_status(f"[JSON Warning] {j_err}")

        write_vtt_file(raw_segments, out_vtt_path)
        log_status(f"[WebVTT Subtitles ✅] Збережено субтитри VTT ({os.path.getsize(out_vtt_path)} байт) -> {out_vtt_path}")
        return True

    # 4. Спроба розпізнавання через Gemini AI якщо модель Whisper не розпізнала
    temp_wav = out_vtt_path.replace(".vtt", "_temp16k.wav")
    has_wav = extract_audio_ffmpeg(media_path, temp_wav)
    if has_wav:
        base_title = os.path.splitext(os.path.basename(media_path))[0]
        gemini_segments = transcribe_with_gemini(temp_wav, movie_title=base_title)
        if os.path.exists(temp_wav):
            try: os.remove(temp_wav)
            except: pass
        if gemini_segments:
            write_vtt_file(gemini_segments, out_vtt_path)
            log_status(f"[Gemini Subtitles ✅] Збережено субтитри VTT від Gemini -> {out_vtt_path}")
            return True

    if os.path.exists(temp_wav):
        try: os.remove(temp_wav)
        except: pass

    # ПОВНЕ ВИДАЛЕННЯ ФЕЙКОВОЇ ГЕНЕРАЦІЇ SUBTITLES!
    log_status(f"❌ [Whisper Fatal Error] Не вдалося транскрибувати файл: {media_path}. Фейкові субтитри НЕ створюються.")
    return False

def main():
    if len(sys.argv) < 2:
        log_status("Usage: python transcribe.py <input_file_or_url_or_directory> [output_vtt_or_directory]")
        sys.exit(1)

    input_arg = sys.argv[1]
    output_arg = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.getcwd(), "public", "subtitles")

    log_status(f"🚀 [Whisper] Старт обробки відео/аудіо: {input_arg}")
    log_status(f"[Whisper] Папка призначення WebVTT: {output_arg}")

    engine_info = load_whisper_models()

    processed_count = 0

    if os.path.isdir(input_arg):
        media_extensions = {".mp4", ".mkv", ".avi", ".mov", ".webm", ".mp3", ".wav", ".m4a", ".aac"}
        log_status(f"[Whisper Batch] Сканування директорії для серій: {input_arg}")
        found_files = []
        for root, dirs, files in os.walk(input_arg):
            for file in sorted(files):
                ext = os.path.splitext(file)[1].lower()
                if ext in media_extensions:
                    found_files.append(os.path.join(root, file))

        if not found_files:
            log_status(f"[Whisper Notice] Медіафайли у папці {input_arg} не знайдені")
            sys.exit(0)

        out_dir = output_arg if not output_arg.endswith(".vtt") else os.path.dirname(output_arg)
        os.makedirs(out_dir, exist_ok=True)

        for media_file in found_files:
            base_filename = os.path.splitext(os.path.basename(media_file))[0]
            vtt_filename = f"{base_filename}_whisper.vtt"
            target_vtt = os.path.join(out_dir, vtt_filename)
            
            if transcribe_single_file(engine_info, media_file, target_vtt):
                processed_count += 1

    else:
        # Single file or URL
        if output_arg.endswith(".vtt"):
            target_vtt = output_arg
        elif os.path.isdir(output_arg) or not os.path.splitext(output_arg)[1]:
            base_filename = os.path.splitext(os.path.basename(input_arg.split('?')[0]))[0]
            target_vtt = os.path.join(output_arg, f"{base_filename}_whisper.vtt")
        else:
            target_vtt = output_arg

        if transcribe_single_file(engine_info, input_arg, target_vtt):
            processed_count += 1

    if processed_count == 0:
        log_status("❌ [Whisper Fatal Error] Транскрипцію не виконано (жодного файлу не оброблено). Фейкові субтитри не створюються.")
        sys.exit(1)

    print(f"SUCCESS: Transcribed {processed_count} file(s) into WebVTT format.")
    log_status(f"🎉 [Whisper Complete] Успішно оброблено та створено субтитри для {processed_count} файл(ів).")

if __name__ == "__main__":
    main()

