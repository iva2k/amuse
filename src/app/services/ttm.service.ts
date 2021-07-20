// To use, copy this to the user module:
// import { TtmService } from './app/services/ttm.service';

import { Injectable } from '@angular/core';

import * as Debug from 'debug';
const debug = Debug('amuse:ttm');
debug.enabled = true;

const engineRev = '0.1-20210719';

// Importing PegJs files based on glob pattern.
// Typescript needs @types/node and @types/webpack-env (also add them to types: [ "node", "webpack-env" ] in tsconf.json).

// Requires and returns all modules that match given context
const requireAll = (requireContext: __WebpackModuleApi.RequireContext) => requireContext.keys().map(requireContext);

const parsers_ttm = requireAll(require.context('../../assets/', false, /^\.\/ttm\.js$/));
// //TODO: (someday) Roll this code into requireAll(), add name to parsers arrays:
const files_ttm = (require.context('../../assets/', false, /^\.\/ttm\.js$/).keys());

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
      ttm_parser: '', // this.decoderInfo(),
    };
  }

  // Lets each parser process given text, picks the best result, returns group:
  // parsed - array with result from each parser
  // best   - best match. Not necessarily the complete match, so caller should check if matched length equals input text length)
  // best_cnt - count of how many parsers delivered same best match (in case of overlapping parsers there will be multiple matches)
  private parseAll(parsers, files, text, options = {}) {
    const parsed = [];
    let best;
    //var best_pos = -1;
    let best_cnt = 0;
    if (text) {
      // text = text.trim();  // Remove leading/trailing whitespace - all parsers put off by whitespace
      // text = text.toUpperCase(); // Convert case - all parsers are uppercase
      for (let i = 0, len = parsers.length; i < len; i++) {
        const parser_file = files ? files[i].split('/')[1] : '';
        // Unfortunately there's no access to the internal Chrome debugger info: parsers[i].parse["[[FunctionLocation]]"];

        try {
          const p = parsers[i].parse(text, options);
          // p.confidence = p.confidence || 100; // Set maximum 100 confidence by default (if parser does not return its lower confidence)
          parsed.push({data:p, len:text.length, confidence:(p.confidence || 100), e:{}, file:parser_file, num: i});
        } catch (e) {
          // Copy version info from options to output
          const data = { version: '', parser_file };
          // if (options && options._ver) { data.version = options._ver; }
          // Analyze parse errors
          const length_parsed = e.location ? (e.location.start.offset ? e.location.start.offset : e.location.end.offset) : 0;
          //debug('Parser #' + i + ', stopped after ' + length_parsed + ' error: ' + e.toString());
          parsed.push({data, len:length_parsed, e, confidence:0, file:parser_file, num:i});
        }
        // Capture and count top results (longer parse or error-free parse wins)
        if (false
          || !best
          || best.len < parsed[i].len
          || (!!best.e.name && !parsed[i].e.name)
          || (best.confidence < parsed[i].confidence) // Choose result with higher confidence value.
        ) {
          best = parsed[i];
          //best_pos = i;
          best_cnt = 1;
        } else if (best.len === parsed[i].len
           && (best.confidence <= parsed[i].confidence)
           && ((!best.e.name && !parsed[i].e.name) || (!!best.e.name && !!parsed[i].e.name)) ) {
          // Count same length and same error states only, exclude lower confidence
          best_cnt++;
        }
      }
    }
    return {parsed, best, best_cnt /*, best_pos */};
  }

//
// returns result: {
//
// }
//
  private processTtm(
    textinput: string,
  ) {
    debug('processTtm(textinput=%o)', textinput);
    const input = {
      textinput,
    };

    const ttm_defaults = {};

    const ttm_options = Object.assign({}, ttm_defaults); // Fast shallow-clone using prototype
    // delete ttm_options.parser; delete ttm_options.version; delete ttm_options._ver;
    const {parsed:ttm_parsed, best:ttm_parse, best_cnt:ttm_parse_cnt} = this.parseAll(parsers_ttm, files_ttm, textinput, ttm_options);
    const ttm_result = ttm_parse ? ttm_parse.data : {};
    let parser_file = '';
    let parser_info = '';
    let parser_name = '';
    let parser_ver = '';
    if (ttm_parse) {
      parser_file = (ttm_parse.file ? ttm_parse.file.replace(/\.js/i,'') : ('parser #' + ttm_parse.num));
      parser_info = parser_file;
      parser_name = (ttm_parse.data ? ttm_parse.data.parser : '');
      parser_ver  = (ttm_parse.data ? ttm_parse.data.version : '');
    }
    if (!ttm_result) {
      debug('  - ttm "%o" parse failed'
       + (ttm_parse
          ? ', best match ' + ttm_parse.len + ' letters in parser '
            + (ttm_parse.file ? ttm_parse.file : ('#' + ttm_parse.num))
          : '')
       + ' %o',
      textinput, ttm_parse);
    } else {
      if (ttm_parse_cnt > 1) {
        parser_info += ' [' + ttm_parse_cnt + ' matches]';
        debug('  WARNING: More than 1 parser matched Text "%o", [%s matches].', textinput, ttm_parse_cnt);
        // TODO: (soon) Parsers Bug report / telemetry.
      }
      debug('  - ttm "%s" parse cnt:%s result: %o', textinput, ttm_parse_cnt, ttm_result);
    }

    let res;
    if (ttm_result) {
      // Data decoded
      res = {
        // Result status
        status          : 0,
        statusDescr     : 'ok',
        statusDetails   : '',
        parser          : parser_info,
        parser_name     : parser_name,
        parser_version  : parser_ver,

        input           : textinput,

        // Raw parser results
        ttm_result      : ttm_result,

      };
    } else {
      // Parsing failed.
      res = {
        // Result status
        status          : 1, // 0-ok, 1-parsing failed, 2-parsed incompletely
        statusDescr     : 'Failed',
        statusDetails   : '',
        parser          : parser_info,
        parser_name     : parser_name,
        parser_version  : parser_ver,

        // Echo input fields as entered, or give corrections
        input           : textinput,

        // Raw parser results
        ttm_result      : ttm_result,

        // other data is not required
      };
      if (ttm_parse) {
        // Output additional details
        if (textinput.length === ttm_parse.len) {
          res.status = 2;
          res.statusDetails = 'Compilation failed at ' + ttm_parse.len + ' position by "' + parser_file + '".';
          res.statusDescr = 'Input not recognized';
        } else {
          res.statusDetails = 'Compilation failed at ' + ttm_parse.len + ' position by "' + parser_file + '".';
          res.statusDescr += ' (unrecognized part "...' + textinput.slice(ttm_parse.len) + '")';
        }
      }
    }
    if (debug.enabled) { // DEBUG: store intermediate data
      res.ttm_parsed  = ttm_parsed;
      //res.parsers_ttm = parsers_ttm.length;
    }
    res.engine_rev = engineRev;
    debug('processTtm(input=%o) result: %o', textinput, res);
    return res;
  }

  async processOne(textinput: string) {
    const result = this.processTtm(textinput + '\n'); // Add CRLF to ensure parser will not choke on last line
    debug('Processed result: %o', result);
    return result;
  }
}
