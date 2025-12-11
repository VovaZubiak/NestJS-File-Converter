import sys
import os
import subprocess
from PIL import Image


def log_error(message):
    sys.stderr.write(message)
    sys.exit(1)

def process_image(input_path, output_path, target_format):
    try:
        with Image.open(input_path) as img:
            if target_format == 'jpeg' and img.mode in ('RGBA', 'LA'):
                background = Image.new('RGB', img.size, (255, 255, 255))
                background.paste(img, mask=img.split()[-1])
                img = background
            elif target_format == 'pdf' and img.mode == 'RGBA':
                img = img.convert('RGB')
            
            img.save(output_path, target_format.upper())
    except Exception as e:
        log_error(f"Image Error: {str(e)}")

def process_media(input_path, output_path):
    ffmpeg_exe = os.path.join(os.getcwd(), 'ffmpeg.exe')
    if not os.path.exists(ffmpeg_exe):
        ffmpeg_exe = 'ffmpeg'

    command = [
        ffmpeg_exe, '-y', '-i', input_path, 
        '-preset', 'ultrafast',
        output_path
    ]
    
    try:
        result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if result.returncode != 0:
            log_error(f"FFmpeg Error: {result.stderr.decode('utf-8', errors='ignore')}")
    except Exception as e:
        log_error(f"Media Error: {str(e)}")

def process_document(input_path, output_path, target_ext):
    try:
        input_ext = os.path.splitext(input_path)[1].lower()

        if input_ext == '.docx' and target_ext == 'pdf':
            from docx2pdf import convert
            convert(input_path, output_path)

        elif input_ext == '.txt' and target_ext == 'pdf':
            from fpdf import FPDF
            pdf = FPDF()
            pdf.add_page()
            pdf.set_font("Arial", size=12)
            
            with open(input_path, 'r', encoding='utf-8') as f:
                for line in f:
                    safe_text = line.encode('latin-1', 'replace').decode('latin-1') 
                    pdf.cell(200, 10, txt=safe_text, ln=1)
            pdf.output(output_path)

        elif input_ext == '.pdf' and target_ext == 'txt':
            from PyPDF2 import PdfReader
            reader = PdfReader(input_path)
            with open(output_path, 'w', encoding='utf-8') as f:
                for page in reader.pages:
                    text = page.extract_text()
                    if text:
                        f.write(text + "\n")
        
        else:
            log_error(f"Conversion from {input_ext} to {target_ext} not supported yet")

    except Exception as e:
        log_error(f"Document Error: {str(e)}")


def main():
    if len(sys.argv) < 3:
        log_error("Usage: python converter.py <input> <format>")

    input_file = sys.argv[1]
    target_ext = sys.argv[2].lower().replace('.', '') 

    if not os.path.exists(input_file):
        log_error(f"File not found: {input_file}")

    root, _ = os.path.splitext(input_file)
    output_file = f"{root}.{target_ext}"

    image_formats = ['jpeg', 'jpg', 'png', 'webp', 'gif', 'bmp', 'tiff']
    video_formats = ['mp4', 'avi', 'mov', 'mkv', 'webm']
    audio_formats = ['mp3', 'wav', 'ogg', 'flac', 'aac']
    doc_formats   = ['pdf', 'docx', 'txt', 'rtf']

    if target_ext in video_formats or target_ext in audio_formats:
        process_media(input_file, output_file)
    
    elif target_ext in doc_formats:
        process_document(input_file, output_file, target_ext)
    
    else:
        process_image(input_file, output_file, target_ext)

    print(output_file)

if __name__ == "__main__":
    main()