import { Component } from '@angular/core';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss']
})
export class Tab1Page {
  public textinput = [
    'Scale C Major',
    'Time 4/4',
    'Tempo 76',
    'Verse 4',
    'I',
    'V',
    'vi',
    'IV',
    'Chorus 4',
    'I',
    'V',
    'vi',
    'IV',
  ].join('\n');
  constructor() {}
  onPlay() {
    console.log('onPlay()');
  }

}
