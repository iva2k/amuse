import { Component } from '@angular/core';
import { TtmService } from '../services/ttm.service';
import { MusicPlayerService } from '../services/music-player.service';

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
    private musicPlayerService: MusicPlayerService,
  ) {
  }

  onInput(event) {
    this.textinput = event.target.value;
  }

  async onPlay() {
    const outputs = await this.musicPlayerService.getMidiOutputs();
    console.log('MIDI outputs: %o', outputs);

    // this.port = this.musicPlayerService.getMidiPort('TinySynth'); // Get specific named MIDI port
    // this.port = this.musicPlayerService.getMidiPort('Web Audio'); // Get specific named MIDI port
    this.port = await this.musicPlayerService.getMidiPort(undefined); // Get first available MIDI port
    console.log('onPlay() port=%o', this.port);

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
