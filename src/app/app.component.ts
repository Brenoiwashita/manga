import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MangaDexService } from '../service/manga';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
})
export class AppComponent {
  private readonly mangaDexService = inject(MangaDexService);

  searchText = '';
  mangas: any[] = [];
  chapters: any[] = [];
  pages: string[] = [];

  selectedManga: any = null;
  selectedChapter: any = null;

  loadingMangas = false;
  loadingChapters = false;
  loadingPages = false;

  readonly historyStorageKey = 'mangadex-reading-history';
  readingHistory: any[] = [];

  constructor() {
    this.loadReadingHistory();
  }

  searchManga(): void {
    if (!this.searchText.trim()) return;

    this.loadingMangas = true;
    this.mangas = [];
    this.chapters = [];
    this.pages = [];
    this.selectedManga = null;
    this.selectedChapter = null;

    this.mangaDexService.searchManga(this.searchText).subscribe({
      next: (res) => {
        this.mangas = res.data;
        this.loadingMangas = false;
      },
      error: (err) => {
        console.error('Erro ao buscar mangás:', err);
        this.loadingMangas = false;
      },
    });
  }

  selectManga(manga: any): void {
    this.selectedManga = manga;
    this.chapters = [];
    this.pages = [];
    this.selectedChapter = null;
    this.loadingChapters = true;

    this.mangaDexService.getMangaFeed(manga.id).subscribe({
      next: (res) => {
        this.chapters = res.data;
        this.loadingChapters = false;
      },
      error: (err) => {
        console.error('Erro ao buscar capítulos:', err);
        this.loadingChapters = false;
      },
    });
  }

  selectChapter(chapter: any): void {
    this.selectedChapter = chapter;
    this.saveReadingHistory(chapter);
    this.pages = [];
    this.loadingPages = true;

    this.mangaDexService.getChapterPages(chapter.id, false).subscribe({
      next: (pages) => {
        this.pages = pages;
        this.loadingPages = false;
      },
      error: (err) => {
        console.error('Erro ao buscar páginas:', err);
        this.loadingPages = false;
      },
    });
  }

  getMangaTitle(manga: any): string {
    return (
      manga.attributes?.title?.['pt-br'] ||
      manga.attributes?.title?.en ||
      manga.attributes?.title?.ja ||
      Object.values(manga.attributes?.title || {})[0] ||
      'Sem título'
    ) as string;
  }

  getChapterTitle(chapter: any): string {
    const number = chapter.attributes?.chapter;
    const title = chapter.attributes?.title;

    if (number && title) return `Capítulo ${number} - ${title}`;
    if (number) return `Capítulo ${number}`;
    if (title) return title;

    return 'Capítulo sem nome';
  }

  getCoverUrl(manga: any): string | null {
    const cover = manga.relationships?.find(
      (rel: any) => rel.type === 'cover_art'
    );
  
    const fileName = cover?.attributes?.fileName;
  
    if (!fileName) return null;
  
    return `/api/mangadex-upload/covers/${manga.id}/${fileName}`;
  }

  loadReadingHistory(): void {
    const history = localStorage.getItem(this.historyStorageKey);

    this.readingHistory = history ? JSON.parse(history) : [];
  }

  private saveReadingHistory(chapter: any): void {
    if (!this.selectedManga || !chapter) return;

    const item = {
      mangaId: this.selectedManga.id,
      mangaTitle: this.getMangaTitle(this.selectedManga),
      mangaCoverUrl: this.getCoverUrl(this.selectedManga),
      chapterId: chapter.id,
      chapterTitle: this.getChapterTitle(chapter),
      readAt: new Date().toISOString(),
    };

    const historyWithoutCurrent = this.readingHistory.filter(
      (historyItem) => historyItem.mangaId !== item.mangaId
    );

    this.readingHistory = [item, ...historyWithoutCurrent].slice(0, 8);

    localStorage.setItem(
      this.historyStorageKey,
      JSON.stringify(this.readingHistory)
    );
  }

  continueReading(historyItem: any): void {
    this.selectedManga = {
      id: historyItem.mangaId,
      attributes: {
        title: {
          'pt-br': historyItem.mangaTitle,
        },
      },
      relationships: [],
    };

    this.selectedChapter = null;
    this.pages = [];
    this.chapters = [];
    this.loadingChapters = true;

    this.mangaDexService.getMangaFeed(historyItem.mangaId).subscribe({
      next: (res) => {
        this.chapters = res.data;
        this.loadingChapters = false;

        const chapter = this.chapters.find(
          (item: any) => item.id === historyItem.chapterId
        );

        if (chapter) {
          this.selectChapter(chapter);
        }
      },
      error: (err) => {
        console.error('Erro ao buscar capítulos:', err);
        this.loadingChapters = false;
      },
    });
  }

  selectChapterById(chapterId: string): void {
    const chapter = this.chapters.find((item) => item.id === chapterId);
  
    if (chapter) {
      this.selectChapter(chapter);
    }
  }

  clearReadingHistory(): void {
    this.readingHistory = [];
    localStorage.removeItem(this.historyStorageKey);
  }
}