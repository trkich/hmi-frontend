import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslationService, Language } from '../../../core/i18n/translation.service';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './language-switcher.component.html',
})
export class LanguageSwitcherComponent {
  private translationService = inject(TranslationService);

  dropdownOpen = signal(false);
  currentLanguage = signal<Language>(this.translationService.getLanguage());

  languages: { code: Language; label: string; flag: string }[] = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'hr', label: 'Hrvatski', flag: '🇭🇷' },
  ];

  getCurrentLanguageLabel = computed(() => {
    const lang = this.currentLanguage();
    const language = this.languages.find((l) => l.code === lang);
    return language ? `${language.flag} ${language.label}` : '🇬🇧 English';
  });

  toggleDropdown(): void {
    this.dropdownOpen.update((val) => !val);
  }

  closeDropdown(): void {
    this.dropdownOpen.set(false);
  }

  setLanguage(lang: Language): void {
    this.translationService.setLanguage(lang);
    this.currentLanguage.set(lang);
  }
}

