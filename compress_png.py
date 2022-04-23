from glob import glob
import cv2
import numpy as np

bts = 0
compressed_png = 0
for png in glob('docs\**\*.png',recursive=True):
    with open(png,'rb') as f:
        buf = f.read()
        bts += len(buf)
    cv2buf = cv2.imdecode(np.asarray(bytearray(buf), dtype='uint8'),cv2.IMREAD_UNCHANGED)
    v,buf = cv2.imencode('.png',cv2buf,[cv2.IMWRITE_PNG_COMPRESSION,9])
    with open(png,'wb') as f:
        f.write(buf)
    compressed_png += len(buf)
print("before compress: "+str(bts))
print("after compress: "+str(compressed_png))