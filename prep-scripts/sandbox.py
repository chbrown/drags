#!/usr/bin/env python
# from rpy2 import robjects
# r = robjects.r
import sys, os
from lib import align_waves

# align_waves(
#     '../recordings/male_female/magenta_m.wav',
#     '../recordings/male_female/magenta_f.wav',
#     '/Users/chbrown/Desktop/magenta_m-l+magenta_f-r.wav')
# align_waves(
#     '../recordings/male_female/magenta_f.wav',
#     '../recordings/male_female/magenta_m.wav',
#     '/Users/chbrown/Desktop/magenta_f-l+magenta_m-r.wav', show_graphs=True)
# sys.stdout.write("Waiting to exit (press <enter>) ")
# data = sys.stdin.readline()

left = '../recordings/silence.wav'
right = '../recordings/book.wav'
output = '/Users/chbrown/Desktop/book-r.wav'

align_waves(left, right, output)
    
os.system('lame -h -b 128 %s %s.mp3' % (output, output[:-4]))



