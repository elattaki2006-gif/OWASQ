// src/app/services/storage.service.ts

import { Injectable } from '@angular/core';
import { Checklist } from '../models/checklist';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly STORAGE_KEY = 'asvs_checklist_progress';

  constructor() {}

  private isStorageAvailable(): boolean {
    return typeof localStorage !== 'undefined';
  }

  saveProgress(checklist: Checklist): void {
    if (!this.isStorageAvailable()) return;

    try {
      const json = JSON.stringify(checklist);
      localStorage.setItem(this.STORAGE_KEY, json);
      console.log('Progress saved to localStorage');
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  }

  loadProgress(): Checklist | null {
    if (!this.isStorageAvailable()) return null;

    try {
      const json = localStorage.getItem(this.STORAGE_KEY);
      if (json) {
        const data = JSON.parse(json);
        return new Checklist(data);
      }
      return null;
    } catch (error) {
      console.error('Error loading progress:', error);
      return null;
    }
  }

  clearProgress(): void {
    if (!this.isStorageAvailable()) return;

    localStorage.removeItem(this.STORAGE_KEY);
    console.log('Progress cleared from localStorage');
  }

  autoSave(checklist: Checklist): void {
    setTimeout(() => {
      this.saveProgress(checklist);
    }, 30000);
  }
}
