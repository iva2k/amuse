// To use, copy this to the user module:
// import { TtmService } from './app/services/ttm.service';

import { Injectable } from '@angular/core';

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

  async processOne(textinput: string) {
    const result = this.processTtm(textinput + '\n'); // Add CRLF to ensure parser will not choke on last line
    debug('Processed result: %o', result);
    return result;
  }
}
