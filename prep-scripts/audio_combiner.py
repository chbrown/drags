#!/usr/bin/env python
import wave
import audioop
import os
import sys
import math
import binascii
import struct
from rpy2 import robjects
from collections import deque
import time

r = robjects.r

parser = argparse.ArgumentParser(description='Combine two waves.')
parser.add_argument('left', type=str, help='the left track')
parser.add_argument('right', type=str, help='the right track')
parser.add_argument('x', type=str, help='')

# args = parser.parse_args()

waves = []
for arg in sys.argv:
    if arg.endswith('wav'):
        waves.append(arg)

# 1 is left, 2 is right
wave_2 = wave.open(waves[1])

# (nchannels, sampwidth, framerate, nframes, comptype, compname)
mono_params = wave_1.getparams() # (1, 2, 44100, 25600, 'NONE', 'not compressed')
stereo_params = tuple([2] + list(mono_params[1:])) # (2, 2, 44100, 25600, 'NONE', 'not compressed')

console_height = 20
console_width = 80
def reset_console_dimensions():
    console_height_width = os.popen('stty size', 'r').read().split()
    global console_height
    console_height = int(console_height_width[0])
    global console_width
    console_width = int(console_height_width[1])




    
    
        
    
    
def print_mono_waveform(frames, sample_width=2):
    reset_console_dimensions()
    
    # audioop's "width" is equivalent to the wave's sampwidth (which = 2, for 16-bit audio)
    
    # bar_length is the number of frames that will be reduced to each column.
    bar_length_in_frames = int(math.ceil((len(frames)/sample_width)/console_width))
    bar_avgs = []
    # e.g. range(3) returns [0, 1, 2]
    for i in range(console_width):
        # the sample width = 2, so we multiply by two (if nframes = 100, len(wave_bytes) = 200)
        begin_i = bar_length_in_frames * i * sample_width
        end_i = begin_i + (bar_length_in_frames * sample_width)
        bar_frames = frames[begin_i:(end_i + sample_width)]
        bar_avg = audioop.avg(bar_frames, sample_width)
        bar_avgs.append(bar_avg)
        
    # print bar_avgs
    
    bar_avgs = equalize(bar_avgs, minimum=-1, maximum=1)
    
    # print bar_avgs
    
    height = int(console_height - 2)
    amplitude = int(float(height) / 2.0)
    
    # waveform[i] is the 
    waveform_array = []
    for j, bar_avg in enumerate(bar_avgs):
        # filled_count = int(bar_avg * height)
        
        peak = int(float(amplitude) * bar_avg)
        adjusted = peak + amplitude
        if peak < 0:
            line = (' ' * adjusted) + 'v' + ('|' * ((amplitude - adjusted) - 1)) + (' ' * (height - amplitude))
        else:
            line = (' ' * amplitude) + ('|' * (adjusted - amplitude)) + '^' + (' ' * (height - adjusted - 1))
            # line = (' ' * (filled_count - 1)) + 'o' + (' ' * (height - filled_count))
        waveform_array.append(line)
    
    # we must reverse the range, or else we'll get the negative samples at the top, and the negative samples at the bottom.
    for k in reversed(range(height)):
        print ''.join([waveform[k] for waveform in waveform_array])
        
    # print 'Done'

    


# wave_1_smoothed_frames = smooth_frames(wave_1_frames) #, smoothing_factor=0.2)


def replot_with_smoothing_factor(smoothing_factor):
    wave_1_smoothed_frames = smooth_frames(wave_1_frames, smoothing_factor=smoothing_factor)
    plot_waveform(wave_1_frames)
    plot_waveform(wave_1_smoothed_frames)
    
replot_with_smoothing_factor(5)


    
    


