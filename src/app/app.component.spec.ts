import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { DomSanitizer } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';
import { GeminiService } from './services/gemini.service';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let mockGeminiService: jasmine.SpyObj<GeminiService>;
  let sanitizer: DomSanitizer;

  beforeEach(() => {
    mockGeminiService = jasmine.createSpyObj('GeminiService', ['generateContentFromImage']);

    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        { provide: GeminiService, useValue: mockGeminiService },
        DomSanitizer
      ]
    });

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    sanitizer = TestBed.inject(DomSanitizer);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  describe('onFileSelected', () => {
    it('should set pdfFile and preview URL when file is selected', () => {
      const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
      const event = {
        target: {
          files: [file]
        }
      } as unknown as Event;

      spyOn(URL, 'createObjectURL').and.returnValue('blob:test-url');
      component.onFileSelected(event);

      expect(component.pdfFile).toBe(file);
      expect(component.cloneReady).toBeFalse();
      expect(component.showDownloadSection).toBeFalse();
    });

    it('should not set anything if no file is selected', () => {
      const event = { target: { files: [] } } as unknown as Event;
      component.onFileSelected(event);
      expect(component.pdfFile).toBeNull();
    });
  });

  describe('processWithProgressBar', () => {
    it('should not process if no file is selected', () => {
      component.pdfFile = null;
      component.processWithProgressBar();
      expect(component.isProcessing).toBeFalse();
    });

    it('should simulate progress and call service', fakeAsync(() => {
      const file = new File(['dummy'], 'doc.pdf', { type: 'application/pdf' });
      component.pdfFile = file;

      mockGeminiService.generateContentFromImage.and.returnValue(of({ fields: {} }));

      component.processWithProgressBar();
      expect(component.isProcessing).toBeTrue();
      tick(600); // simulate progress interval
      tick(500); // simulate finalize delay

      expect(component.progress).toBe(100);
      expect(component.isProcessing).toBeFalse();
    }));

    it('should handle service error gracefully', fakeAsync(() => {
      const file = new File(['dummy'], 'doc.pdf', { type: 'application/pdf' });
      component.pdfFile = file;

      mockGeminiService.generateContentFromImage.and.returnValue(throwError(() => new Error('Service failed')));

      spyOn(console, 'error');
      component.processWithProgressBar();
      tick(600);
      tick(500);

      expect(console.error).toHaveBeenCalledWith('Processing Error:', jasmine.any(Error));
      expect(component.progress).toBe(100);
      expect(component.isProcessing).toBeFalse();
    }));
  });
});
