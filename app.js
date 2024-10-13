const STAFF_TOP = 60
const STAFF_LEFT = 15

const GKEY_LEFT = 15
const GKEY_TOP = STAFF_TOP - 21.5

const STAFF_HALF_INTERVAL_HEIGHT = 8.95

const BLACK_DOWN_LEFT = 100
const BLACK_DOWN_TOP_INTERVAL = STAFF_TOP + .5 // offset to put blackdown on the highest interval

const BLACK_UP_LEFT = 100
const BLACK_UP_TOP_INTERVAL = -2.5 // offset to put blackup on the highest interval

const FLAT_LEFT = 75
const FLAT_TOP_INTERVAL = 43

const LEDGER_LEFT = 95
const LEDGER_TOP_LINE = STAFF_TOP

// the middle C position in the G key
const BLACK_DOWN_FIRST_LOW_LEDGER_HEIGHT = BLACK_DOWN_TOP_INTERVAL + STAFF_HALF_INTERVAL_HEIGHT * 9
const FLAT_FIRST_LOW_LEDGER_HEIGHT = FLAT_TOP_INTERVAL + STAFF_HALF_INTERVAL_HEIGHT * 9
const PIANO_NUMBER_MIDDLE_C = 40

function setPos(elem, x, y)
{
    elem.style.transform = `translate(${x}px, ${y}px) translateZ(0)`
}

function show(elem)
{
    elem.style.display = 'block'
}

function hide(elem)
{
    elem.style.display = 'none'
}

const KEY_G = 'key G'
const SIGNATURE_EMPTY = 'signature-empty'

function assert(condition, message=undefined)
{
    if (!condition)
        throw new Error(message);
}

const ledgers = [ledger0, ledger1, ledger2, ledger3, ledger4, ledger5]
// -3: shows three ledgers above the staff
// 2: shows two ledgers below the staff
// 0 hides all the ledgers
function showLedgers(num, x_offset=0)
{
    assert(num == Math.trunc(num), "num should be an integer")
    if (num < 0)
    {
        num = -num;
        for (let i = 0; i < num; i++)
        {
            show(ledgers[i]);
            setPos(ledgers[i], LEDGER_LEFT + x_offset, LEDGER_TOP_LINE - STAFF_HALF_INTERVAL_HEIGHT * 2 * (i+1));
        }
        for (let i = num; i < ledgers.length; i++)
        {
            hide(ledgers[i]);
        }
    }
    else
    {
        for (let i = 0; i < num; i++)
        {
            show(ledgers[i]);
            setPos(ledgers[i], LEDGER_LEFT + x_offset, LEDGER_TOP_LINE + STAFF_HALF_INTERVAL_HEIGHT * 2 * (i+1 + 4));
        }
        for (let i = num; i < ledgers.length; i++)
        {
            hide(ledgers[i]);
        }
    }
}

// 0 corresponds to the middle C
// .5 means there should be a sharp in front, or the height is one more with a flat
function getHeightOnStaff(key, signature, pianoNoteNumber)
{
    assert(key === KEY_G);
    assert(signature === SIGNATURE_EMPTY);

    const offset = pianoNoteNumber - PIANO_NUMBER_MIDDLE_C

    let numOctaves = Math.trunc(offset / 12)
    let rem = offset % 12;
    if (rem < 0)
    {
        numOctaves++;
        rem += 12;
    }
    if (rem >= 5)
    {
        return numOctaves * 7 + rem / 2 + .5;
    }
    else
    {
        return numOctaves * 7 + rem / 2
    }
}

// E above center is 56 (top interval in key of G)
// middle G = 51
// F = 50
function showNote(key, signature, pianoNoteNumber, preferFlats=false)
{
    assert(key === KEY_G);
    assert(signature === SIGNATURE_EMPTY);

    hide(blackup)
    hide(blackdown)
    hide(flat)
    hide(sharp)

    let heightOnStaff = getHeightOnStaff(key, signature, pianoNoteNumber)
    if (heightOnStaff != Math.trunc(heightOnStaff))
    {
        if (preferFlats)
        {
            heightOnStaff = Math.ceil(heightOnStaff);
            show(flat)
            setPos(flat, FLAT_LEFT, FLAT_FIRST_LOW_LEDGER_HEIGHT - heightOnStaff * STAFF_HALF_INTERVAL_HEIGHT)
        }
        else
        {
            heightOnStaff = Math.floor(heightOnStaff);
            show(sharp)
            setPos(sharp, FLAT_LEFT, FLAT_FIRST_LOW_LEDGER_HEIGHT - heightOnStaff * STAFF_HALF_INTERVAL_HEIGHT)
        }
    }

    show(blackdown)
    setPos(blackdown, BLACK_DOWN_LEFT, BLACK_DOWN_FIRST_LOW_LEDGER_HEIGHT - heightOnStaff * STAFF_HALF_INTERVAL_HEIGHT)

    if (heightOnStaff <= 0)
    {
        showLedgers(1 - Math.trunc(heightOnStaff / 2))
    }
    else if (heightOnStaff >= 12 /* height of the entire staff */)
    {
        showLedgers(Math.ceil((12 - heightOnStaff) / 2) - 1)
    }
    else
    {
        showLedgers(0)
    }

}

function initAudioContext()
{
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.minDecibels = -100;
    analyser.maxDecibels = -10;
    analyser.smoothingTimeConstant = 0.85;
    if (!navigator?.mediaDevices?.getUserMedia) {
        // No audio allowed
        alert(`${navigator} ${navigator?.mediaDevices} ${navigator?.mediaDevices?.getUserMedia}`)
        return;
    } else {
        navigator.mediaDevices.getUserMedia({audio: true})
        .then(stream => {
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);
        }).catch(err => {
            alert("This app won't work without a microphone")
        });
    }
}

// returns a number in [lo, hi)
function randint(lo, hi)
{
    return Math.trunc(Math.random() * (hi - lo) + lo)
}

function pickRandomPianoNote()
{
    return randint(40, 60)
}

let popUpTimeout = -1;
function showError(msg)
{
    error_popup.textContent = msg
    error_popup.classList.remove('hidden')

    if (popUpTimeout >= 0) window.clearTimeout(popUpTimeout);

    popUpTimeout = window.setTimeout(() => error_popup.classList.add('hidden'), 2000)
}



let analyser, audioContext;


function freqToPianoNote(freq)
{
    return Math.round(12 * Math.log(freq / 440) / Math.log(2) + 49)
}

// we wait to hear a note for at 10 frames, within a range of 2 piano notes to
// trigger the callback
const SMOOTHING_NUM_FRAMES = 5
const SMOOTHING_ALLOWED_UNCERTAINTY = 1
let previousPianoNote = -1; // means we have heard nothing
let numFramesHeardPianoNote = 0;

function listenForNote(cb)
{
    let buf = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buf);
    let autoCorrelateValue = autoCorrelate(buf, audioContext.sampleRate)

    if (autoCorrelateValue == -1)
    {
        numFramesHeardPianoNote = 0;
        previousPianoNote = -1;
        window.requestAnimationFrame(() => listenForNote(cb));
        return;
    }

    const pianoNote = freqToPianoNote(autoCorrelateValue);

    if (pianoNote != -1 && Math.abs(previousPianoNote - pianoNote) <= SMOOTHING_ALLOWED_UNCERTAINTY)
    {
        // console.log("heard piano note again!", pianoNote, previousPianoNote, numFramesHeardPianoNote)
        numFramesHeardPianoNote++;
        if (numFramesHeardPianoNote == SMOOTHING_NUM_FRAMES)
        {

            cb(pianoNote);
        }
    }
    else
    {
        // console.log("heard new piano note", pianoNote)
        numFramesHeardPianoNote = 0
        previousPianoNote = pianoNote
    }

    window.requestAnimationFrame(() => listenForNote(cb))
}


const pianoNoteNames = ["G#", "A", "A#", "B", "C", "C#", "D", "D#", "E", "E#", "F#", "G"]

function getPianoNoteName(pianoNoteNumber)
{
    return pianoNoteNames[pianoNoteNumber%pianoNoteNames.length]
}

function nextNote()
{
    waitingForPianoNote = pickRandomPianoNote();
    showNote(KEY_G, SIGNATURE_EMPTY, waitingForPianoNote, Math.random() > .5);
    console.log("waiting for", waitingForPianoNote, getPianoNoteName(waitingForPianoNote));
}

let waitingForPianoNote = -1;
function onNotePlayed(pianoNote)
{
    if (!(30 <= pianoNote && pianoNote <= 80))
    {
        return; // ignore those pianoNoteNames, they are probably just noise
    }
    if (waitingForPianoNote != pianoNote)
    {
        showError(`Wrong note, this is not a <${pianoNote}> ${pianoNoteNames[pianoNote%pianoNoteNames.length]}, try again`);
    }
    else
    {
        nextNote();
    }

}

document.addEventListener("DOMContentLoaded", () => {
    initAudioContext();
    hide(fkey)
    hide(natural)
    hide(sharp)
    hide(flat)
    hide(blackup)
    hide(blackdown)
    showLedgers(0);

    setPos(staff, STAFF_LEFT, STAFF_TOP);
    setPos(gkey, GKEY_LEFT, GKEY_TOP)

    listenForNote(onNotePlayed);

    nextNote();
})

/*
The MIT License (MIT)
Copyright (c) 2014 Chris Wilson
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

Note: autoCorrelate comes from https://github.com/cwilso/PitchDetect/pull/23
with the above license.

*/




// Must be called on analyser.getFloatTimeDomainData and audioContext.sampleRate
// From https://github.com/cwilso/PitchDetect/pull/23
function autoCorrelate(buffer, sampleRate) {
  // Perform a quick root-mean-square to see if we have enough signal
  var SIZE = buffer.length;
  var sumOfSquares = 0;
  for (var i = 0; i < SIZE; i++) {
    var val = buffer[i];
    sumOfSquares += val * val;
  }
  var rootMeanSquare = Math.sqrt(sumOfSquares / SIZE)
  if (rootMeanSquare < 0.01) {
    return -1;
  }

  // Find a range in the buffer where the values are below a given threshold.
  var r1 = 0;
  var r2 = SIZE - 1;
  var threshold = 0.2;

  // Walk up for r1
  for (var i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buffer[i]) < threshold) {
      r1 = i;
      break;
    }
  }

  // Walk down for r2
  for (var i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buffer[SIZE - i]) < threshold) {
      r2 = SIZE - i;
      break;
    }
  }

  // Trim the buffer to these ranges and update SIZE.
  buffer = buffer.slice(r1, r2);
  SIZE = buffer.length

  // Create a new array of the sums of offsets to do the autocorrelation
  var c = new Array(SIZE).fill(0);
  // For each potential offset, calculate the sum of each buffer value times its offset value
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE - i; j++) {
      c[i] = c[i] + buffer[j] * buffer[j+i]
    }
  }

  // Find the last index where that value is greater than the next one (the dip)
  var d = 0;
  while (c[d] > c[d+1]) {
    d++;
  }

  // Iterate from that index through the end and find the maximum sum
  var maxValue = -1;
  var maxIndex = -1;
  for (var i = d; i < SIZE; i++) {
    if (c[i] > maxValue) {
      maxValue = c[i];
      maxIndex = i;
    }
  }

  var T0 = maxIndex;

  // Not as sure about this part, don't @ me
  // From the original author:
  // interpolation is parabolic interpolation. It helps with precision. We suppose that a parabola pass through the
  // three points that comprise the peak. 'a' and 'b' are the unknowns from the linear equation system and b/(2a) is
  // the "error" in the abscissa. Well x1,x2,x3 should be y1,y2,y3 because they are the ordinates.
  var x1 = c[T0 - 1];
  var x2 = c[T0];
  var x3 = c[T0 + 1]

  var a = (x1 + x3 - 2 * x2) / 2;
  var b = (x3 - x1) / 2
  if (a) {
    T0 = T0 - b / (2 * a);
  }

  return sampleRate/T0;
}
