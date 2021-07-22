// To use, copy this to the user module:
// import { TtmService } from './app/services/ttm.service';

import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { Chord, Note, Interval, Progression, Scale } from '@tonaljs/tonal';

import * as Debug from 'debug';
const debug = Debug('amuse:ttm');
debug.enabled = true;

const engineRev = '0.1-20210719';

// Not strictly required to use glob right now - have only one parser.
// TODO: (later) revisit if glob is still needed (when more parsers are implemented)

// Importing parser files based on glob pattern.
// Typescript use of require.context() needs @types/node and @types/webpack-env
// (also should be added to types: [ "node", "webpack-env" ] in tsconf.json).

// Requires and returns all modules that match given context
const requireAll = (requireContext: __WebpackModuleApi.RequireContext) => requireContext.keys().map(requireContext);

const parsersTtm = requireAll(require.context('../../assets/', false, /^\.\/ttm\.js$/));
// //TODO: (someday) Roll this code into requireAll(), add name to parsers arrays:
const filesTtm = (require.context('../../assets/', false, /^\.\/ttm\.js$/).keys());

// if (!String.prototype.trim) {
//   String.prototype.trim = function(pattern) {
//     return this.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
//   };
// }

@Injectable({
  providedIn: 'root'
})
export class TtmService {

  constructor() { }

  async info() {
    return {
      engineRev,
    };
  }

  // Lets each parser process given text, picks the best result, returns group:
  // parsed - array with result from each parser
  // best   - best match. Not necessarily the complete match, so caller should check if matched length equals input text length)
  // bestCnt - count of how many parsers delivered same best match (in case of overlapping parsers there will be multiple matches)
  private parseAll(parsers, files, text, options = {}) {
    const parsed = [];
    let best;
    //let bestPos = -1;
    let bestCnt = 0;
    if (text) {
      // text = text.trim();  // Remove leading/trailing whitespace - all parsers put off by whitespace
      // text = text.toUpperCase(); // Convert case - all parsers are uppercase
      for (let i = 0, len = parsers.length; i < len; i++) {
        const parserFile = files ? files[i].split('/')[1] : '';
        // Unfortunately there's no access to the internal Chrome debugger info: parsers[i].parse["[[FunctionLocation]]"];

        try {
          const p = parsers[i].parse(text, options);
          // p.confidence = p.confidence || 100; // Set maximum 100 confidence by default (if parser does not return its lower confidence)
          parsed.push({data:p, len:text.length, confidence:(p.confidence || 100), e:{}, file:parserFile, num: i});
        } catch (e) {
          // Copy version info from options to output
          const data = { version: '', parserFile };
          // Analyze parse errors
          const lengthParsed = e.location ? (e.location.start.offset ? e.location.start.offset : e.location.end.offset) : 0;
          //debug('Parser #' + i + ', stopped after ' + lengthParsed + ' error: ' + e.toString());
          parsed.push({data, len:lengthParsed, e, confidence:0, file:parserFile, num:i});
        }
        // Capture and count top results (longer parse or error-free parse wins)
        if (false
          || !best
          || best.len < parsed[i].len
          || (!!best.e.name && !parsed[i].e.name)
          || (best.confidence < parsed[i].confidence) // Choose result with higher confidence value.
        ) {
          best = parsed[i];
          //bestPos = i;
          bestCnt = 1;
        } else if (best.len === parsed[i].len
           && (best.confidence <= parsed[i].confidence)
           && ((!best.e.name && !parsed[i].e.name) || (!!best.e.name && !!parsed[i].e.name)) ) {
          // Count same length and same error states only, exclude lower confidence
          bestCnt++;
        }
      }
    }
    return {parsed, best, bestCnt /*, bestPos */};
  }

//
// returns result: {
//
// }
//
  private processTtm(
    textinput: string,
    options = {}
  ) {
    debug('processTtm(textinput=%o, options=%o)', textinput, options);

    const {parsed:parsed, best:parse, bestCnt:parseCnt} = this.parseAll(parsersTtm, filesTtm, textinput, options);
    const result = parse ? parse.data : {};
    let parserFile = '';
    let parserInfo = {};
    let parserName = '';
    let parserVer  = '';
    if (parse) {
      parserFile = (parse.file ? parse.file.replace(/\.js/i,'') : ('parser #' + parse.num));
      parserInfo = { parserFile, };
      parserName = (parse.data ? parse.data.parser : '');
      parserVer  = (parse.data ? parse.data.version : '');
    }
    if (!result) {
      debug('  - ttm "%o" parse failed'
       + (parse
          ? ', best match ' + parse.len + ' letters in parser '
            + (parse.file ? parse.file : ('#' + parse.num))
          : '')
       + ' %o',
      textinput, parse);
    } else {
      if (parseCnt > 1) {
        parserInfo += ' [' + parseCnt + ' matches]';
        debug('  WARNING: More than 1 parser matched Text "%o", [%s matches].', textinput, parseCnt);
        // TODO: (soon) Parsers Bug report / telemetry.
      }
      debug('  - ttm "%s" parse cnt:%s result: %o', textinput, parseCnt, result);
    }

    let res;
    if (result) {
      // Data decoded
      res = {
        // Result status
        status          : 0,
        statusDescr     : 'ok',
        statusDetails   : '',
        parserInfo,
        parserName,
        parserVer,

        input           : textinput,

        // Parser results
        result,

      };
    } else {
      // Parsing failed.
      res = {
        // Result status
        status          : 1, // 0-ok, 1-parsing failed, 2-parsed incompletely
        statusDescr     : 'Failed',
        statusDetails   : '',
        parserInfo,
        parserName,
        parserVer,

        // Echo input fields as entered, or give corrections
        input           : textinput,

        // Parser results
        result,

        // other data is not required
      };
      if (parse) {
        // Output additional details
        if (textinput.length === parse.len) {
          res.status = 2;
          res.statusDetails = 'Compilation failed at ' + parse.len + ' position by "' + parserFile + '".';
          res.statusDescr = 'Input not recognized';
        } else {
          res.statusDetails = 'Compilation failed at ' + parse.len + ' position by "' + parserFile + '".';
          res.statusDescr += ' (unrecognized part "...' + textinput.slice(parse.len) + '")';
        }
      }
    }
    if (debug.enabled) { // DEBUG: store intermediate data
      res.parsed  = parsed;
      //res.parsersCnt = parsersTtm.length;
    }
    res.engineRev = engineRev;
    debug('processTtm(input=%o) result: %o', textinput, res);
    return res;
  }

  private postProcess(ttmObj: any) {
    let currentKeyCmd;
    let currentTimeCmd;
    let currentTempoCmd;
    let currentPlayCmd;
    ttmObj.result.cmds.map((cmd, idx) => {
      // Edit object in place
      //debug('postProcess() cmd[%d]: %o', idx, cmd);
      switch (cmd.cmd.toLowerCase()) {
        case 'scale':
        case 'key':
          const scale = Scale.get(cmd.scaleName.toLowerCase());
          cmd.scaleArr = scale.notes;
          cmd.scaleTonic = scale.tonic;
          currentKeyCmd = cmd;
          break;
        case 'time':
          currentTimeCmd = cmd;
          break;
        case 'tempo':
          currentTempoCmd = cmd;
          break;
        case 'verse':
        case 'chorus':
          currentPlayCmd = cmd;

          // Translate chord progression (harmonic analysis form) into chords
          let chords = cmd.chordsProgression ? cmd.chordsProgression : [];
          chords = chords.map(c => {
            let ret = c;
            if (c === c.toLowerCase()) {
              // Add "m" (minor) to lowercase chords, as @tonaljs/tonal.Progression does not care for lowercaseness as indication of minor.
              ret = ret + 'm';
            }
            return ret;
          });
          cmd.chords = Progression.fromRomanNumerals(currentKeyCmd ? currentKeyCmd.scaleTonic : 'C', chords);

          // Break chords into notes
          cmd.chordNotes = [];
          cmd.chords.map(chord => {
            let notes = Chord.get(chord).notes;
            notes = notes.map(note => note + '4'); // Add octave // TODO: somehow define which octave to play in.
            cmd.chordNotes.push(notes);
          });
          break;
        }
    });
    debug('postProcess(ttmObj: %o) result: %o', ttmObj);
    return ttmObj;
  }
  async processOne(textinput: string) {
    const result = this.processTtm(textinput + '\n'); // Add CRLF to ensure parser will not choke on last line
    this.postProcess(result);
    debug('Processed result: %o', result);
    return result;
  }

  private startNotes(port, notes) {
    debug('startNotes(notes:%o)', notes);
    const ch = 0;
    const velocity = 127;
    notes.map(note => port.noteOn(ch, note, velocity));
  }
  private stopNotes(port, notes) {
    const ch = 0;
    debug('stopNotes(notes:%o)', notes);
    notes.map(note => port.noteOff(ch, note));
  }

  private calculateMeasureTimeMs(timeSignature, tempoBpm) {
    if (!tempoBpm) { return 1000; } // Safe default
    const [beatsPerMeasure, oneBeatType] = timeSignature.split('/');
    // numberOfBeatsPerMinute = tempoBpm (N/min) * 1min
    // beatTime (s) = 60s / numberOfBeatsPerMinute
    // beatTime (s) = 60s / (tempoBpm (N/min) * 1min)
    // measureTime (s)  = beatTime (s) * beatsPerMeasure
    // measureTime (s)  = 60s / (tempoBpm (N/min) * 1min) * beatsPerMeasure
    // measureTime (ms) = measureTime (s) * (1000ms/s)
    return (60 * 1000 / tempoBpm * beatsPerMeasure);
  }

  private playerSubject = new Subject();
  private playerObservableObj;
  private stop$ = new Subject();
  // private audioObj = {};
  private playerObservable(port, ttmObj) {
    let ttmIndex;
    let currentKeyCmd;
    let currentTimeCmd;
    let currentTempoCmd;
    let currentPlayCmd;
    let currentPlayCnt = 0;
    let currentPlayNotesToStop;
    let currentMeasureTimeMs = 1000;

    const events = [
      'ended', 'error', 'play', 'playing', 'pause', 'timeupdate', 'canplay', 'loadedmetadata', 'loadstart'
    ];

    this.playerObservableObj = this.playerSubject.asObservable();

    // Our worker will be also observing the subject, to schedule events asynchronously.
    this.playerObservableObj.subscribe(event => {
      debug('playerObservable()->subscribe event: %s, ttmIndex=%o, currentPlayCnt=%o', event.type, ttmIndex, currentPlayCnt);
      switch (event.type) {
        case 'loadstart':
          ttmIndex = 0;
          this.playerSubject.next({type: 'playing'});
          break;
        case 'playing':
          this.playerSubject.next({type: 'timeupdate', index: ttmIndex});
          break;
        case 'timeupdate':
          if (0 <= event.index && event.index < ttmObj.result.cmds.length) {
            const cmd = ttmObj.result.cmds[event.index];
            switch (cmd.cmd.toLowerCase()) {
              case 'scale':
              case 'key':
                currentKeyCmd = cmd;
                break;
              case 'time':
                currentTimeCmd = cmd;
                break;
              case 'tempo':
                currentTempoCmd = cmd;
                currentMeasureTimeMs = this.calculateMeasureTimeMs(currentTimeCmd.time, cmd.tempo);
                break;
              case 'verse':
              case 'chorus':
                currentPlayCmd = cmd;

                if (currentPlayNotesToStop) {
                  this.stopNotes(port, currentPlayNotesToStop);
                }

                if (currentPlayCnt < cmd.count) {
                  const notesIndex = currentPlayCnt % cmd.chordNotes.length;
                  currentPlayNotesToStop = cmd.chordNotes[notesIndex];
                  // let notesArray = (typeof any(notes) === Array) ? notes : [notes];
                  this.startNotes(port, currentPlayNotesToStop);
                  currentPlayCnt += 1;

                  // Schedule notes duration
                  setTimeout(() => this.playerSubject.next({type: 'timeupdate', index: ttmIndex}), currentMeasureTimeMs);

                  return; // Avoid advancing ttmIndex and emitting 'timeupdate' below.
                }
                break;
              }
              ttmIndex++;
              currentPlayNotesToStop = [];
              currentPlayCnt = 0;
              this.playerSubject.next({type: 'timeupdate', index: ttmIndex});

          } else {
            this.playerSubject.next({type: 'ended'});
          }
          break;
        case 'ended':
          this.playerSubject.complete();
          break;
      }
    });
    this.playerSubject.next({type: 'loadstart'});
    return this.playerObservableObj;
  }

  getPlayer(port, ttmObj) {
    return this.playerObservable(port, ttmObj).pipe(takeUntil(this.stop$));
  }

  // playerPlay() {
  //   this.audioObj.play();
  // }

  // playerPause() {
  //   this.audioObj.pause();
  // }

  // playerStop() {
  //   this.stop$.next();
  // }

  // playerSeekTo(seconds) {
  //   this.audioObj.currentTime = seconds;
  // }

  // formatTime(time, format) {
  //   return moment.utc(time).format(format);
  // }

}
