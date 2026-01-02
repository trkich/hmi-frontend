import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { AzureSpeechService } from '../../core/debriefing/azure-speech.service';

declare var SpeechSDK: any;

@Component({
  selector: 'app-unit-instance-debrief',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './unit-instance-debrief.component.html',
})
export class UnitInstanceDebriefComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private speechService = inject(AzureSpeechService);

  instanceId = signal<string | null>(null);
  unitId = signal<string | null>(null);

  // State
  isListening = signal(false);
  isInitialized = signal(false);
  status = signal<string>('');
  recognizedText = signal<string>('');
  
  // Speech recognizer instance
  private recognizer: any = null;
  private speechConfig: any = null;

  // Language options
  languages = [
    { code: 'en-US', name: 'English (US)' },
    { code: 'hr-HR', name: 'Croatian' },
    { code: 'de-DE', name: 'German' },
    { code: 'fr-FR', name: 'French' },
    { code: 'es-ES', name: 'Spanish' },
  ];
  selectedLanguage = signal('en-US');

  ngOnInit(): void {
    const instanceId = this.route.snapshot.paramMap.get('instanceId');
    const unitId = this.route.snapshot.paramMap.get('unitId');
    
    if (instanceId) {
      this.instanceId.set(instanceId);
      if (unitId) {
        this.unitId.set(unitId);
      }
      this.initializeSpeechSDK();
    } else {
      this.status.set('ERROR: Instance ID is required');
    }
  }

  ngOnDestroy(): void {
    this.stopRecognizer();
  }

  private async initializeSpeechSDK(): Promise<void> {
    try {
      if (typeof SpeechSDK === 'undefined') {
        this.status.set('Speech SDK not loaded. Please include the SDK script.');
        return;
      }

      this.status.set('Getting authentication token...');
      const tokenResponse = await firstValueFrom(this.speechService.getToken());
      
      if (!tokenResponse?.token) {
        this.status.set('ERROR: Failed to get authentication token');
        return;
      }

      this.status.set('Initializing speech recognition...');
      
      this.speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(
        tokenResponse.token,
        tokenResponse.region || 'eastus'
      );
      
      this.speechConfig.speechRecognitionLanguage = this.selectedLanguage();

      this.isInitialized.set(true);
      this.status.set('Ready to start recognition. Click "Start" to begin.');
    } catch (error: any) {
      console.error('Speech SDK initialization error:', error);
      this.status.set(`ERROR: ${error?.message || error}`);
    }
  }

  async startRecognition(): Promise<void> {
    if (!this.isInitialized() || this.isListening()) {
      return;
    }

    try {
      const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
      this.speechConfig.speechRecognitionLanguage = this.selectedLanguage();

      this.recognizer = new SpeechSDK.SpeechRecognizer(this.speechConfig, audioConfig);

      this.recognizer.recognizing = (s: any, e: any) => {
        if (e.result.reason === SpeechSDK.ResultReason.RecognizingSpeech) {
          this.status.set(`Listening... (${e.result.text})`);
        }
      };

      this.recognizer.recognized = (s: any, e: any) => {
        if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
          const newText = this.recognizedText() + (this.recognizedText() ? ' ' : '') + e.result.text;
          this.recognizedText.set(newText);
          this.status.set('Recognized. Continue speaking or click "Stop".');
        } else if (e.result.reason === SpeechSDK.ResultReason.NoMatch) {
          this.status.set('No speech could be recognized.');
        }
      };

      this.recognizer.canceled = (s: any, e: any) => {
        let str = 'Canceled: ';
        str += SpeechSDK.CancellationReason[e.reason];
        if (e.reason === SpeechSDK.CancellationReason.Error) {
          str += ': ' + e.errorDetails;
        }
        this.status.set(str);
        this.isListening.set(false);
        this.recognizer = null;
      };

      this.recognizer.sessionStopped = () => {
        this.status.set('Session stopped.');
        this.isListening.set(false);
        this.recognizer = null;
      };

      this.recognizer.startContinuousRecognitionAsync(
        () => {
          this.isListening.set(true);
          this.status.set('Listening... Speak into your microphone.');
        },
        (err: any) => {
          this.status.set(`ERROR: ${err?.message || err}`);
          this.stopRecognizer();
        }
      );
    } catch (error: any) {
      console.error('Start recognition error:', error);
      this.status.set(`ERROR: ${error?.message || error}`);
      this.isListening.set(false);
    }
  }

  stopRecognizer(): void {
    if (!this.recognizer) {
      this.isListening.set(false);
      return;
    }

    const recognizerRef = this.recognizer;
    this.recognizer = null;
    this.isListening.set(false);

    recognizerRef.stopContinuousRecognitionAsync(
      () => {
        try {
          recognizerRef.close();
          this.status.set('Stopped.');
        } catch (error) {
          console.error('Error closing recognizer:', error);
          this.status.set('Stopped.');
        }
      },
      (err: any) => {
        this.status.set(`ERROR stop: ${err}`);
        try {
          recognizerRef.close();
        } catch (closeError) {
          console.error('Error closing recognizer on stop error:', closeError);
        }
      }
    );
  }

  clearText(): void {
    this.recognizedText.set('');
    this.status.set('Text cleared.');
  }

  onLanguageChange(language: string): void {
    this.selectedLanguage.set(language);
    if (this.speechConfig) {
      this.speechConfig.speechRecognitionLanguage = language;
      this.status.set(`Language changed to ${language}. ${this.isListening() ? 'Stop and restart to apply.' : ''}`);
    }
  }

  async copyToClipboard(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.recognizedText());
      this.status.set('Text copied to clipboard!');
      setTimeout(() => {
        if (!this.isListening()) {
          this.status.set('Ready to start recognition. Click "Start" to begin.');
        }
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      this.status.set('Failed to copy text to clipboard.');
    }
  }

  goBack(): void {
    if (this.unitId() && this.instanceId()) {
      this.router.navigate(['/unit', this.unitId(), 'instance', this.instanceId()]);
    } else if (this.unitId()) {
      this.router.navigate(['/unit', this.unitId()]);
    } else {
      this.router.navigate(['/unit']);
    }
  }
}

