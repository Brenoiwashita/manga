import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable, switchMap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class MangaDexService {
  private readonly http = inject(HttpClient);
  // private readonly apiUrl = 'https://api.mangadex.org';
  private readonly apiUrl = '/api/mangadex';

  searchManga(title: string): Observable<any> {
    const params = new HttpParams()
      .set('title', title)
      .set('limit', 20)
      .append('availableTranslatedLanguage[]', 'pt-br')
      .append('includes[]', 'cover_art')
      .set('order[relevance]', 'desc');

    return this.http.get(`${this.apiUrl}/manga`, { params });
  }

  getMangaById(mangaId: string): Observable<any> {
    const params = new HttpParams()
      .append('includes[]', 'cover_art')
      .append('includes[]', 'author')
      .append('includes[]', 'artist');

    return this.http.get(`${this.apiUrl}/manga/${mangaId}`, { params });
  }

  getMangaFeed(mangaId: string): Observable<any> {
    const params = new HttpParams()
      .set('limit', 100)
      .append('translatedLanguage[]', 'pt-br')
      .set('order[chapter]', 'asc');

    return this.http.get(`${this.apiUrl}/manga/${mangaId}/feed`, { params });
  }

  getChapterById(chapterId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/chapter/${chapterId}`);
  }

  getChapterPages(chapterId: string, dataSaver = false): Observable<string[]> {
    return this.http
      .get<any>(`${this.apiUrl}/at-home/server/${chapterId}`)
      .pipe(
        map((response) => {
          const baseUrl = response.baseUrl;
          const hash = response.chapter.hash;
          const files = dataSaver
            ? response.chapter.dataSaver
            : response.chapter.data;

          const mode = dataSaver ? 'data-saver' : 'data';

          return files.map((fileName: string) => {
            const path = `${mode}/${hash}/${fileName}`;
          
            return `/api/mangadex-upload/${path}`;
          });
        })
      );
  }

  getMangaChaptersWithPages(mangaId: string): Observable<any[]> {
    return this.getMangaFeed(mangaId).pipe(
      map((response) => response.data),
      switchMap((chapters) => {
        const requests = chapters.map((chapter: any) =>
          this.getChapterPages(chapter.id).pipe(
            map((pages) => ({
              ...chapter,
              pages,
            }))
          )
        );

        return requests.length
          ? new Observable<any[]>((observer) => {
              Promise.all(
                requests.map(
                  (request: Observable<any>) =>
                    new Promise((resolve, reject) => {
                      request.subscribe({
                        next: resolve,
                        error: reject,
                      });
                    })
                )
              )
                .then((result) => {
                  observer.next(result as any[]);
                  observer.complete();
                })
                .catch((error) => observer.error(error));
            })
          : new Observable<any[]>((observer) => {
              observer.next([]);
              observer.complete();
            });
      })
    );
  }

  getCoverUrl(manga: any): string | null {
    const cover = manga.relationships?.find(
      (rel: any) => rel.type === 'cover_art'
    );

    const fileName = cover?.attributes?.fileName;

    if (!fileName) return null;

    return `https://uploads.mangadex.org/covers/${manga.id}/${fileName}`;
  }
}
