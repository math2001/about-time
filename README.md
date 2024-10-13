Processing the audio is done by autocorrelation, a very simple technique
explained on [Alex Ellis' blog](https://alexanderell.is/posts/tuner/). The
main limitation is that it can't properly detect chords, only single notes at
a time. That's ok, I'm still learning how to read one note at a time anyway.

Displaying the notes is done by `tranform: translate(x, y)` SVG `path`
elements from JavaScript. That was a bad idea.

I took most of the SVG path from [Wikipedia's music symbol]
(https://en.wikipedia.org/wiki/List_of_musical_symbols).
