import wave
import struct
import math
from rpy2 import robjects
r = robjects.r

def equalize(numbers, minimum=0, maximum=1):
    original_minimum = min(numbers)
    original_maximum = max(numbers)
    original_range = float(original_maximum - original_minimum)
    
    target_range = float(maximum - minimum)
    
    conv = lambda x: ((float(x - original_minimum) / original_range) * target_range) + minimum
    
    return map(conv, numbers)

def smooth_numbers(numbers, window):
    number_count = len(numbers)
    smoothed_numbers = [None]*number_count
    window_right = int(window / 2)
    window_left = window - window_right
    
    indices = range(-window_left, window_right)
    running_sum = sum(numbers[i % number_count] for i in indices)
    for j in range(number_count):
        smoothed_numbers[j] = running_sum / window
        running_sum -= numbers[(j - window_left) % number_count]
        running_sum += numbers[(j + window_right + 1) % number_count]
        
    return smoothed_numbers

def max_numbers(numbers, window):
    number_count = len(numbers)
    max_numbers = [None]*number_count
    window_right = int(window / 2)
    window_left = window - window_right
    
    indices = range(-window_left, window_right)
    running_max = max(numbers[i % number_count] for i in indices)
    for j in range(number_count):
        max_numbers[j] = running_max
        if running_max == numbers[(j - window_left) % number_count]:
            running_max = max(numbers[k % number_count] for k in range((j - window_left) + 1, j + window_right + 1))
        else:
            running_max = max(numbers[(j + window_right + 1) % number_count], running_max)
        
    return max_numbers



def save_stero_wave(out_file, frames):
    ''' file is an absolute or local filepath. frames is a string of octal (or whatever mono wavs provide) bytes. '''
    wave_out = wave.open(out_file, 'w')
    wave_out.setnchannels(2)
    wave_out.setsampwidth(2)
    wave_out.setframerate(44100)
    wave_out.writeframes(frames) # sets nframes automatically
    wave_out.close()
    
def read_wave_to_sample_list(wav, sample_width=2):
    ''' wav is a fully specified filename. the sample_width is fine at default for mono'''
    wave_file = wave.open(wav)
    wave_frames = wave_file.readframes(wave_file.getnframes())
    wave_file.close()
    
    sample_count = len(wave_frames) / sample_width
    
    samples = []
    for i in range(sample_count):
        # real_sample = audioop.getsample(frames, sample_width, index)
        start_index = i * sample_width
        sample_bytes = wave_frames[start_index:(start_index + sample_width)]
        sample_value = struct.unpack("<h", sample_bytes)[0]
        samples.append(sample_value)
        
    return samples
    
def sample_list_to_wav_frames(samples, sample_width=2):
    '''not currently using the sample_width'''
    frames = []
    for sample in samples:
        try:
            frames.append(struct.pack("<h", sample))
        except Exception, e:
            import pdb; pdb.set_trace()
    return ''.join(frames)

def abs_max_smooth_samples(samples, max_window=None, avg_window=None):
    '''Currently does not maxify! Don't be deceived!''' 
    absolutes = [abs(sample) for sample in samples]

    if max_window is None:
        max_window = int(len(samples) / 50)
    if avg_window is None:
        avg_window = max_window

    # maxxed = max_numbers(absolutes, max_window)
    smoothed = smooth_numbers(absolutes, avg_window)
    
    # smoothed is now a list of absolute (positive) values
    return smoothed

def index_of_max(numbers):
    index = -1
    max_number = -1
    for m, sample in enumerate(numbers):
        if sample > max_number:
            max_number = sample
            index = m
    
    return index

def plot_waveform(samples):
    sample_len = len(samples)

    x = robjects.IntVector(range(1, sample_len + 1))
    y = robjects.IntVector(samples)
    r.plot(x, y, xlab="time", ylab="amplitude", type="l")

def align_waves(mono_wav_l, mono_wav_r, stereo_wave_out, show_graphs=False):
    # [0] = left
    # [1] = right
    wave_pair = [mono_wav_l, mono_wav_r]
    sample_pair = map(read_wave_to_sample_list, wave_pair)
    
    max_window = 500
    avg_window = 10000
    smoothed_pair = [
        abs_max_smooth_samples(sample_pair[0], max_window, avg_window),
        abs_max_smooth_samples(sample_pair[1], max_window, avg_window)]

    if show_graphs:
        r.X11()
        r.par(mfrow=robjects.IntVector([3,2])) # rows then columns
        plot_waveform(sample_pair[0])
        plot_waveform(sample_pair[1])

        plot_waveform(smoothed_pair[0])
        plot_waveform(smoothed_pair[1])
        # map(plot_waveform, realigned_pair)

    max_index_pair = map(index_of_max, smoothed_pair)
    latter_half_lengths_pair = [
        len(sample_pair[0]) - max_index_pair[0],
        len(sample_pair[1]) - max_index_pair[1]]
    
    realigned_pair = [sample_pair[0], sample_pair[1]]
    
    # decide left-padding spacer first:
    min_former_half_length = min(max_index_pair)
    prepend_padding = max(max_index_pair) - min_former_half_length
    # actually add left-padding spacer:
    if max_index_pair[0] < max_index_pair[1]:
        realigned_pair[0] = [0]*prepend_padding + realigned_pair[0]
    else:
        realigned_pair[1] = [0]*prepend_padding + realigned_pair[1]

    # then right-padding spacer next:
    min_latter_half_length = min(latter_half_lengths_pair)
    append_padding = max(latter_half_lengths_pair) - min_latter_half_length
    # actually add right-padding:
    if latter_half_lengths_pair[0] < latter_half_lengths_pair[1]:
        realigned_pair[0] += [0]*append_padding
    else:
        realigned_pair[1] += [0]*append_padding

    if len(realigned_pair[0]) != len(realigned_pair[1]):
        print 'wtf happened?'
        import pdb; pdb.set_trace()
        
        

    realigned_pair_zipped = zip(realigned_pair[0], realigned_pair[1]) # == zip(*realigned_pair)
    # the nested list comprehension expands like this -->
    # for sublist in realigned_pair_zipped:
    #   for item in sublist:
    #     yield item
    realigned_pair_flat = [item for sublist in realigned_pair_zipped for item in sublist]
    
    if show_graphs:
        plot_waveform(realigned_pair[0])
        plot_waveform(realigned_pair[1])


    # note! sample_width is now kind of like 4, because it's stereo!
    realigned_frames = sample_list_to_wav_frames(realigned_pair_flat)
    save_stero_wave(stereo_wave_out, realigned_frames)









    