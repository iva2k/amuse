# Amuse

Amuze / Amuse app. Music theory.

## TTM (Text-To-Music)

### Introduction

There is, of course, music notation / music staff to describe complete musical composition, that is the ultimate and complete method of representing music. It is quite difficult to master this method, even 2 of the 4 Beatles (Paul and George) did not read sheet music.

Another representation is MIDI, which is not accessible to mortals, only computer software could master it.

There are many various methods to represent musical pieces for human consumption, eg. Lead Sheet / Fake Book, harmonic analysis, Tablature (guitar TABs), etc. Existence of these other methods is a good indication of a great need to represent music in human-digestible form.

These forms, however, are not easily accessible to computer use, e.g. they cannot be entered into musical software.

TTM aims to create a human-centric method of representing music (and can be connected to voice interfaces like Alexa) that is also digestible by computers and musical software.

Below are some considerations and TTM format documentation.

### General Principles

TTM aims for quick entry by humans, therefore it uses the following principles, which really boil down to "simple text" with no thrills:

1. Stick to music industry conventions as much as possible
2. Use simple alphabet and numbers found on standard computer keyboard keys
3. Completely avoid use of symbols that are not found on keyboards
4. Avoid all typographical features, such as bolds/italics, subscripts, superscripts, non latin alphabets, graphical icons, and any other exotics that are hard to enter on mobile or desktop computers
5. For all symbols found on keyboards (e.g. on numeric keys, parenthesis, curly braces, less/more, square brackets, commas, semicolons and colons) that are a bit more difficult to type fast, the use is minimized if other simpler methods are accessible, e.g. using "Space" to separate entities and "Enter" key breaking lines to separate to a further degree.

These principles lead us to choose "simple text" with line-oriented format of
`command[SPACE]value[ENTER]` approach.

Some commands can start a block of lines that e.g. describe notes of a melody representing one measure per line. Notes or cords found in one measure must be placed on one line, one measure per line. It is easy to understand where such a block of measure lines ends, as it can be easily distinguished from all other commands that could follow.

Notes are just their letters A-G (followed by b or # for flat/sharp, - for flat also accepted, e.g. Eb = E-) and underscore '_' is silence or space. At the beginning of 1st measure, spaces can be ommitted. At the end of measures all other measures spaces can be omitted too.

Note durations can be set for all subsequent notes on that line with the following:

* (no symbol) or '0' whole note - Semibreve
* '|' half note - Minim
* '*' quarter note - Crotchet
* '-' eighth note - Quaver
* '=' sixteenth note - Semiquaver
* '\\\' 32nd note (3 flags) - Demisemiquavers
* '\\\\' 64nd note (4 flags)
* '\\\\\' 128th note (5 flags)

The above durations, when combined, set compound length, e.g. '-=' sets 3/16 note, and '---' sets 3/8 note. This avoids "sweep" notation and works for representing dotted notes too. We should mention that sweep notes are needed to represent vocal voicing, that is something to work out later, therefore...
TODO: Ideas revolve around 'space' being voicing split and 'space space' being word split, but it should be tried out.

Note duration can be ommited if next note is the same, but sometimes it is more clear to show each note duration for better clarity.

Notes and Chords are made distinguishable by requiring full Chord notation ("M" for Major, "m" for minor). Chords and notes can have octave number attached to it.

Notes (without octave, when needed, default octave 4 is used):
C C#/Db D D#/Eb E F F#/Gb G G#/Ab A A#/Bb B

Notes with Octave:
C5 C6 etc.

Chords (octave sets root note)
CM_5 C#m_4 etc.

Chord Inversions
TODO
(One idea is to add "-i", "-ii" or such for 1st/2nd inversions)

For 'Verse' and 'Chorus' commands, measure lines contain chords, not notes. Durations are set for whole measure if one cord is given. If two or more chords are given per line, the measure time will be automatically divided between the chords. If different time division is needed, use the above duration notations.

Here's an example TTM block.

TODO: Complete the TTM block, from <https://www.musicnotes.com/sheetmusic/mtd.asp?ppn=MN0101556>
(also need to normalize it to be either all key-relative, or all absolute, and implement normalization and transformation)

```ttm
Key C Major
Time 4 4
Tempo 76
Verse 4
I V
--- vi - V ---- IV
Chorus 4
I
V
vi
IV
Melody
* _ _ _ = G G
- G  =  G  -= A  - E  G  G  = C2 -= D2
= E2 -  E2 -= E2 - D2 D2 C2 * C2
= D2 -= D2 -  E2 = D2 -= D2 - C2 _ = D2 C2

```

### Commands

#### Key (Scale)

Examples:

```ttm
Key C Major
Key Eb Minor
```

#### Time

Examples:

```ttm
Time 4 4
Time 3 4
Time 7 4
```

#### Tempo

Examples:

```ttm
Tempo 120
Tempo 76
```

#### Verse

#### Chorus

#### Melody

#### Vocal

Vocal is similar to the Melody command, but lines with lyrics (split into syllables by spaces) are interleaved with lines of notes. For readability, lyrics lines can be followed by blank lines.

## TODO

* Implement play function
* ttm.peg - implement Verse/Chorus chord mods
* ttm.peg - implement Melody notes
* ttm.peg - implement Melody durations
* ttm.peg - implement Verse/Chorus multi-cord measures and durations
* ttm.peg - implement Voice (copy Melody, add lyrics, in Play should do Karaoke)
