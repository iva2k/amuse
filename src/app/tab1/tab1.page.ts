import { Component } from '@angular/core';
import { TtmService } from '../services/ttm.service';

import * as JZZts from 'jzz';
import * as synth from 'jzz-synth-tiny';
const JZZ: any = JZZts; // Open-up ts definition to allow calling plugins per the JS examples.
synth(JZZ); // Inject plugin into JZZ: JZZ.synth = synth;

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss']
})
export class Tab1Page {
  public textinput = [
    'Key C Major',
    'Time 4/4',
    'Tempo 76',
    'Verse 4',
    'vi',
    'IV',
    'I',
    'V',
    'Chorus 4',
    'vi',
    'IV',
    'I',
    'V',
  ].join('\n');
  private port;
  constructor(
    private ttmService: TtmService,
  ) {
    JZZ().or('Cannot start MIDI engine');
    JZZ.synth.Tiny.register('Synth');
    //? JZZ.synth.Tiny.register('Web Audio');
    //? synth(JZZ);
    //synth.Tiny.register('Synth');

    this.port = JZZ().openMidiOut().or('Cannot open MIDI Out port');
  }

  onInput(event) {
    this.textinput = event.target.value;
  }

  async onPlay() {
    console.log('onPlay()');
    const result = await this.ttmService.processOne(this.textinput);
    console.log('onPlay() result.result.cmds=%o', result.result.cmds);

    this.ttmService.getPlayer(this.port, result).subscribe(
      event => {
        switch (event.type) {
          case 'loadstart':
            break;
          case 'playing':
            break;
          case 'timeupdate':
            break;
          case 'ended':
            break;
        }
      },
      error => console.log('Error in observable: %o', error),
      () => {} // complete callback
    );

  }

}
