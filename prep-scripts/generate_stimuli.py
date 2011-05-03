#!/usr/bin/env python
# import wave
import os
import errno
import sys
# import math
# import struct
# from rpy2 import robjects
# from collections import deque
# import time
import csv
import random
from lib import align_waves

# redefine list.get(...) so that I can call list.get like a dict.get and not crash if there's no item there.
# def list_get(self, index, default=None):
#     if index >= len(self):
#         return default
#     return self[index]
# list.get = list_get 

stimuli_schema = None
input_dir = None
output_dir = None
control_output_dir = None
for arg in sys.argv:
    if arg.endswith('csv'):
        stimuli_schema = arg
    elif arg.startswith('--input='):
        input_dir = arg.split('=')[1]
    elif arg.startswith('--stereo-output='):
        output_dir = arg.split('=')[1]
    elif arg.startswith('--control-output='):
        control_output_dir = arg.split('=')[1]
        
def mkdir_p(filepath):
    try:
        path, filename = os.path.split(filepath)
        if '.' in filename:
            os.makedirs(path)
        else:
            os.makedirs(filepath)
    except OSError as exc:
        if exc.errno == errno.EEXIST:
            pass
        else:
            raise

    

def filename_for(left, right):
    return '%s-l+%s-r.wav' % (left, right)

def convert_wav_to_mp3(wav_filename):
    '''The wav_filename argument may or may not have a .wav extension. If it does, it is removed.'''
    if wav_filename.endswith('.wav'):
        wav_filename = wav_filename[:-4]
    os.system('lame -h -b 128 %s.wav %s.mp3' % (wav_filename, wav_filename))

def align_and_convert_to_mp3(wav_path_l, wav_path_r, wav_path_out_lr):
    if os.path.exists(wav_path_out_lr):
        stderr_line('%s exists already. NOT overwriting.' % wav_path_out_lr)
    '''All of the filenames should be the complete path, WITH .wav at the end'''
    align_waves(wav_path_l, wav_path_r, wav_path_out_lr)
    convert_wav_to_mp3(wav_path_out_lr)
    os.remove(wav_path_out_lr)

def stderr_line(line):
    sys.stderr.write('%s\n' % (str(line)))
    
# def stdout_line(line):
#     sys.stdout.write(line + '\n')
    
    
# __main__
output = csv.writer(sys.stdout)
with open(stimuli_schema, 'r') as stimuli_schema_file:
    stimuli_csv_reader = csv.reader(stimuli_schema_file)
    for stimuli_row in stimuli_csv_reader:
        folder = stimuli_row[0]
        stderr_line('-'*80)
        stderr_line(folder)
        wav_files = []
        for cell in stimuli_row[1:]:
            if cell is not None and len(cell) > 1:
                wav_files.append(cell)
        if control_output_dir is not None:
            mkdir_p(os.path.join(control_output_dir, folder))
            for wav_file in wav_files:
                wave_path = os.path.join(input_dir, folder, wav_file + '.wav')
                mp3_path = os.path.join(control_output_dir, folder, wav_file + '.mp3')
                os.system('lame -h -b 128 %s %s' % (wave_path, mp3_path))
                output.writerow([folder, wav_file])

        # in case there are just two waves, generate all 2 permutations
        if output_dir is not None:
            mkdir_p(os.path.join(output_dir, folder))
            if len(wav_files) == 2:
                wav_path_l = os.path.join(input_dir, folder, wav_files[0] + '.wav')
                wav_path_r = os.path.join(input_dir, folder, wav_files[1] + '.wav')

                wav_path_out = os.path.join(output_dir, folder, filename_for(wav_files[0], wav_files[1]))
                align_and_convert_to_mp3(wav_path_l, wav_path_r, wav_path_out)
                output.writerow([folder, wav_files[0], wav_files[1]])

                wav_path_out = os.path.join(output_dir, folder, filename_for(wav_files[1], wav_files[0]))
                align_and_convert_to_mp3(wav_path_r, wav_path_l, wav_path_out)
                output.writerow([folder, wav_files[1], wav_files[0]])
            else:
                seen = []
                total_count = len(wav_files)
                max_combinations = total_count * (total_count - 1)
                count = 10
                if max_combinations < 10:
                    count = max_combinations
                produced = 0
                for i in range(100): # make sure we don't loop forever, if our randoms happen all really weird
                    if len(seen) >= count:
                        break
                    left, right = random.sample(wav_files, 2)
                    if (left, right) not in seen:
                        wav_path_l = os.path.join(input_dir, folder, left + '.wav')
                        wav_path_r = os.path.join(input_dir, folder, right + '.wav')
                        wav_path_out = os.path.join(output_dir, folder, filename_for(left, right))
                        align_and_convert_to_mp3(wav_path_l, wav_path_r, wav_path_out)
                        output.writerow([folder, left, right])
                        seen.append((left, right))

sys.stdout.flush()
sys.stdout.close()