import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CodeGeneratorComponent } from './code-generator.component';
import { CodeGeneratorService } from '../services/code-generator.service';
import { of, throwError } from 'rxjs';
import * as JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { GeneratedCode } from './code-generator.component';

describe('CodeGeneratorComponent', () => {
    let component: CodeGeneratorComponent;
    let fixture: ComponentFixture<CodeGeneratorComponent>;
    let mockService: jasmine.SpyObj<CodeGeneratorService>;

    const mockGeneratedCode: GeneratedCode = {
        html: '<div>Card</div>',
        javascript: 'console.log("Card");',
        css: '.card { padding: 10px; }'
    };

    beforeEach(async () => {
        const spy = jasmine.createSpyObj('CodeGeneratorService', ['generateCodeFromTemplate']);

        await TestBed.configureTestingModule({
            imports: [CodeGeneratorComponent],
            providers: [{ provide: CodeGeneratorService, useValue: spy }]
        }).compileComponents();

        fixture = TestBed.createComponent(CodeGeneratorComponent);
        component = fixture.componentInstance;
        mockService = TestBed.inject(CodeGeneratorService) as jasmine.SpyObj<CodeGeneratorService>;
    });

    // 📁 File Selection Tests
    it('should accept valid JSON file', () => {
        const file = new File(['{}'], 'template.json', { type: 'application/json' });
        const event = { target: { files: [file] } } as unknown as Event;

        component.onFileSelected(event);

        expect(component.selectedJsonFile).toBe(file);
        expect(component.errorMessage).toBeNull();
    });

    it('should reject non-JSON file', () => {
        const file = new File(['<xml></xml>'], 'template.xml', { type: 'text/xml' });
        const event = { target: { files: [file] } } as unknown as Event;

        component.onFileSelected(event);

        expect(component.selectedJsonFile).toBeNull();
        expect(component.errorMessage).toBe('Please select a valid JSON file.');
    });

    // ⚙️ Code Generation Tests
    it('should show error if no file is selected', fakeAsync(() => {
        component.selectedJsonFile = null;
        component.generateAndDownloadCode();
        tick();

        expect(component.errorMessage).toBe('Please upload a dynamic JSON template file.');
        expect(component.isGenerating).toBeFalse();
    }));

    it('should generate and download code successfully', fakeAsync(() => {
        const file = new File(['{}'], 'template.json', { type: 'application/json' });
        component.selectedJsonFile = file;
        mockService.generateCodeFromTemplate.and.returnValue(of(mockGeneratedCode));

        spyOn(component as any, 'createAndDownloadZip').and.returnValue(Promise.resolve());

        component.generateAndDownloadCode();
        tick();

        expect(component.isGenerating).toBeFalse();
        expect(component.generatedCode).toEqual(mockGeneratedCode);
        expect(component.errorMessage).toBeNull();
        expect((component as any).createAndDownloadZip).toHaveBeenCalledWith(mockGeneratedCode);
    }));

    it('should handle service error gracefully', fakeAsync(() => {
        const file = new File(['{}'], 'template.json', { type: 'application/json' });
        component.selectedJsonFile = file;
        mockService.generateCodeFromTemplate.and.returnValue(throwError(() => new Error('Service failed')));

        component.generateAndDownloadCode();
        tick();

        expect(component.errorMessage).toContain('Generation error: Service failed');
        expect(component.isGenerating).toBeFalse();
    }));

    it('should handle undefined generated code', fakeAsync(() => {
        const file = new File(['{}'], 'template.json', { type: 'application/json' });
        component.selectedJsonFile = file;
        mockService.generateCodeFromTemplate.and.returnValue(of(null as unknown as GeneratedCode));

        component.generateAndDownloadCode();
        tick();

        expect(component.errorMessage).toBe('Generated code is undefined.');
        expect(component.isGenerating).toBeFalse();
    }));

    // 📦 ZIP Creation Tests
    it('should create and download zip file', async () => {
        const saveAsSpy = spyOn(saveAs, 'saveAs');
        await (component as any).createAndDownloadZip(mockGeneratedCode);

        expect(saveAsSpy).toHaveBeenCalled();
    });
});
