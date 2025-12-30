import { Injectable, inject, PLATFORM_ID, signal, computed } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type Language = 'en' | 'hr';

export interface Translations {
  [key: string]: any;
}

// English translations
const enTranslations: Translations = {
  common: {
    dashboard: 'Dashboard',
    unit: 'Unit',
    profile: 'Profile',
    logout: 'Logout',
    login: 'Login',
    welcome: 'Welcome',
    loading: 'Loading...',
    error: 'Error',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    view: 'View',
    close: 'Close',
    actions: 'Actions',
    search: 'Search',
    filter: 'Filter',
    reset: 'Reset',
    select: 'Select',
    noData: 'No data available',
    confirmDelete: 'Are you sure you want to delete',
    previous: 'Previous',
    next: 'Next',
    page: 'Page',
  },
  auth: {
    signIn: 'Sign in with Microsoft',
    signingIn: 'Signing in...',
    signInWithMicrosoft: 'Sign in with your Microsoft account to continue',
    failedToLogin: 'Failed to login with Microsoft. Please try again.',
    loggedInAs: 'Logged in as',
  },
  dashboard: {
    title: 'Dashboard',
    description: 'Welcome to the dashboard. Here you can see an overview of your system.',
    placeholder: 'Your widgets, charts, and overviews will appear here.',
  },
  unit: {
    title: 'Unit',
    description: 'Overview of all units in the system',
    id: 'ID',
    status: 'Status',
    online: 'Online',
    offline: 'Offline',
    noUnits: 'No units available',
    failedToLoad: 'Failed to load units',
    corsError: 'CORS Error: Backend does not allow requests from this domain. Please check backend CORS configuration.',
    unauthorized: 'Unauthorized: Access token is invalid or missing.',
    forbidden: 'Forbidden: You do not have permission to access this resource.',
    notFound: 'Endpoint not found: /unit endpoint does not exist on backend.',
    serverError: 'Server error: Backend has a problem.',
  },
  profile: {
    title: 'Profile',
    description: 'Overview of your profile information',
    entraIdInfo: 'Entra ID Information',
    id: 'ID',
    name: 'Name',
    email: 'Email',
    failedToLoad: 'Failed to load profile',
  },
  sidebar: {
    dashboard: 'Dashboard',
    unit: 'Unit',
    debriefing: 'Debriefing',
    communication: 'Communication',
  },
  debriefing: {
    title: 'Debriefing',
    description: 'Use Azure Speech Service to convert your speech to text in real-time.',
    status: 'Status',
    controls: 'Controls',
    language: 'Language',
    start: 'Start',
    stop: 'Stop',
    clear: 'Clear',
    recognizedText: 'Recognized Text',
    textPlaceholder: 'Your recognized speech will appear here...',
    words: 'words',
    copy: 'Copy to Clipboard',
  },
  communication: {
    title: 'AI Communication',
    start: 'Start',
    signalr: 'SignalR',
    connected: 'Connected',
    disconnected: 'Disconnected',
    instance: 'Instance',
    progress: 'Progress',
    latestEvent: 'Latest Event',
    noEvents: 'No events yet. Click Start.',
    step: 'Step',
    state: 'State',
    message: 'Message',
    time: 'Time',
    output: 'Output',
    eventLog: 'Event Log',
    diagramPlaceholder: 'Diagram will appear here',
    installNgDiagram: 'Install ng-diagram package to enable diagram visualization',
  },
};

// Croatian translations
const hrTranslations: Translations = {
  common: {
    dashboard: 'Nadzorna ploča',
    unit: 'Unit',
    profile: 'Profil',
    logout: 'Odjava',
    login: 'Prijava',
    welcome: 'Dobrodošli',
    loading: 'Učitavanje...',
    error: 'Greška',
    save: 'Spremi',
    cancel: 'Odustani',
    delete: 'Obriši',
    edit: 'Uredi',
    view: 'Pregled',
    close: 'Zatvori',
    actions: 'Akcije',
    search: 'Pretraži',
    filter: 'Filtriraj',
    reset: 'Resetiraj',
    select: 'Izaberi',
    noData: 'Nema podataka',
    confirmDelete: 'Jeste li sigurni da želite obrisati',
    previous: 'Prethodna',
    next: 'Sljedeća',
    page: 'Stranica',
  },
  auth: {
    signIn: 'Prijavite se s Microsoft računom',
    signingIn: 'Prijavljivanje...',
    signInWithMicrosoft: 'Prijavite se s Microsoft računom za nastavak',
    failedToLogin: 'Prijava s Microsoft računom nije uspjela. Molimo pokušajte ponovno.',
    loggedInAs: 'Prijavljen kao',
  },
  dashboard: {
    title: 'Nadzorna ploča',
    description: 'Dobrodošli na nadzornu ploču. Ovdje možete vidjeti pregled vašeg sustava.',
    placeholder: 'Ovdje će biti vaši widgeti, grafikoni i pregledi.',
  },
  unit: {
    title: 'Unit',
    description: 'Pregled svih unit-a u sustavu',
    id: 'ID',
    status: 'Status',
    online: 'Online',
    offline: 'Offline',
    noUnits: 'Nema unit-a',
    failedToLoad: 'Učitavanje unit-a nije uspjelo',
    corsError: 'CORS Greška: Backend ne dozvoljava zahtjeve s ovog domena. Provjerite backend CORS konfiguraciju.',
    unauthorized: 'Neautorizirano: Access token je nevažeći ili nedostaje.',
    forbidden: 'Zabranjeno: Nemate dozvolu za pristup ovom resursu.',
    notFound: 'Endpoint nije pronađen: /unit endpoint ne postoji na backendu.',
    serverError: 'Server greška: Backend ima problem.',
  },
  profile: {
    title: 'Profil',
    description: 'Pregled vaših profil podataka',
    entraIdInfo: 'Entra ID Informacije',
    id: 'ID',
    name: 'Ime',
    email: 'Email',
    failedToLoad: 'Učitavanje profila nije uspjelo',
  },
  sidebar: {
    dashboard: 'Nadzorna ploča',
    unit: 'Unit',
    debriefing: 'Debriefing',
    communication: 'Komunikacija',
  },
  debriefing: {
    title: 'Debriefing',
    description: 'Koristite Azure Speech Service za pretvorbu govora u tekst u realnom vremenu.',
    status: 'Status',
    controls: 'Kontrole',
    language: 'Jezik',
    start: 'Pokreni',
    stop: 'Zaustavi',
    clear: 'Očisti',
    recognizedText: 'Prepoznati Tekst',
    textPlaceholder: 'Vaš prepoznati govor će se pojaviti ovdje...',
    words: 'riječi',
    copy: 'Kopiraj u Međuspremnik',
  },
  communication: {
    title: 'AI Komunikacija',
    start: 'Pokreni',
    signalr: 'SignalR',
    connected: 'Povezano',
    disconnected: 'Odspojeno',
    instance: 'Instanca',
    progress: 'Napredak',
    latestEvent: 'Zadnji Događaj',
    noEvents: 'Nema događaja. Kliknite Pokreni.',
    step: 'Korak',
    state: 'Stanje',
    message: 'Poruka',
    time: 'Vrijeme',
    output: 'Izlaz',
    eventLog: 'Dnevnik Događaja',
    diagramPlaceholder: 'Dijagram će se pojaviti ovdje',
    installNgDiagram: 'Instalirajte ng-diagram paket za omogućavanje vizualizacije dijagrama',
  },
};

@Injectable({ providedIn: 'root' })
export class TranslationService {
  private translations: Record<Language, Translations> = {
    en: enTranslations,
    hr: hrTranslations,
  };

  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);
  private currentLanguage = signal<Language>('en');
  private translationsData = signal<Translations>(this.translations.en);

  constructor() {
    // Load language from localStorage or use default (only in browser)
    if (this.isBrowser && typeof localStorage !== 'undefined') {
      const savedLang = localStorage.getItem('tke_language') as Language;
      if (savedLang && (savedLang === 'en' || savedLang === 'hr')) {
        this.setLanguage(savedLang);
      } else {
        this.setLanguage('en');
      }
    } else {
      // During SSR, just set default language without saving
      this.currentLanguage.set('en');
      this.translationsData.set(this.translations.en);
    }
  }

  setLanguage(lang: Language): void {
    this.currentLanguage.set(lang);
    this.translationsData.set(this.translations[lang]);
    // Only save to localStorage in browser
    if (this.isBrowser && typeof localStorage !== 'undefined') {
      localStorage.setItem('tke_language', lang);
    }
  }

  getLanguage(): Language {
    return this.currentLanguage();
  }

  translate(key: string): string {
    const keys = key.split('.');
    let value: any = this.translationsData();

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
    }

    return typeof value === 'string' ? value : key;
  }

  // Computed signal for reactive translations
  t = computed(() => {
    const lang = this.currentLanguage();
    const data = this.translationsData();
    return (key: string) => {
      const keys = key.split('.');
      let value: any = data;

      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          return key;
        }
      }

      return typeof value === 'string' ? value : key;
    };
  });
}

