import os
import sys
import glob
import shutil
from PIL import Image

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    frames_dir = os.path.join(script_dir, 'frontend', 'temp_frames')
    output_gif = os.path.abspath(os.path.join(script_dir, '..', 'docs', 'assets', 'demo.gif'))

    print(f"Reading frames from: {frames_dir}")
    print(f"Output will be saved to: {output_gif}")

    # Find and sort all PNG frames
    frames_pattern = os.path.join(frames_dir, "frame_*.png")
    frame_files = sorted(glob.glob(frames_pattern))

    if not frame_files:
        print("[ERROR] No frame PNG files found in temp_frames directory.")
        sys.exit(1)

    print(f"Found {len(frame_files)} frames. Loading and preparing images...")
    
    images = []
    # Load first image
    first_img = Image.open(frame_files[0])
    
    # Load and resize to half size to keep GIF file size small and optimized for GitHub
    # Screen is 1440x900, half size is 720x450, perfect for responsive display
    w, h = first_img.size
    target_size = (w // 2, h // 2)
    
    images.append(first_img.resize(target_size, Image.Resampling.LANCZOS))

    for f in frame_files[1:]:
        img = Image.open(f)
        images.append(img.resize(target_size, Image.Resampling.LANCZOS))
        print(f"Loaded and resized: {os.path.basename(f)}")

    print("[RUN] Compiling images into animated GIF...")
    # Save GIF. We set a duration of 1800ms per frame to make it comfortable to read
    images[0].save(
        output_gif,
        save_all=True,
        append_images=images[1:],
        duration=1800,
        loop=0,
        optimize=True
    )
    print(f"[OK] Walkthrough GIF compiled successfully: {output_gif}")

    # Clean up temp frames directory
    print("[CLEAN] Cleaning up temporary frame images...")
    try:
        shutil.rmtree(frames_dir)
        print("[OK] Temporary frames deleted successfully.")
    except Exception as e:
        print(f"[WARN] Could not delete temp_frames folder: {e}")

if __name__ == "__main__":
    main()
