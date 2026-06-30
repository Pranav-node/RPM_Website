from PIL import Image
import numpy as np

input_path = r"C:\Users\GURU\.gemini\antigravity\brain\79ccc3f6-f59e-414d-a6ee-5c7acd44f328\media__1772471627696.png"
output_path = r"C:\Users\GURU\.gemini\antigravity\playground\triple-celestial\rpm-logo-processed.png"

img = Image.open(input_path).convert("RGBA")
data = np.array(img)

# Calculate luminance
r, g, b, a = data[:,:,0], data[:,:,1], data[:,:,2], data[:,:,3]
luminance = 0.299 * r + 0.587 * g + 0.114 * b

# Create smooth alpha channel (white background becomes transparent, dark text becomes opaque)
new_a = 255 - luminance

# Let's boost the contrast of the alpha channel a bit so the logo is crisp
# We'll map luminance 0-150 to alpha 255, and >200 to alpha 0
new_a = (255 - luminance) * 1.5
new_a = np.clip(new_a, 0, 255).astype(np.uint8)

# Set the text color to Gold accent: RGB(201, 168, 76)
data[:,:,0] = 201
data[:,:,1] = 168
data[:,:,2] = 76
data[:,:,3] = new_a

Image.fromarray(data).save(output_path)
print("Logo processed successfully and saved to " + output_path)
