import { CodeGeneratorService } from './code-generator.service';


describe('readFileContent', () => {
    let service: any;
    let mockFileReader: any;

    beforeEach(() => {
        mockFileReader = {
            readAsText: jasmine.createSpy('readAsText').and.callFake(function () {
                // Simulate async file read
                setTimeout(() => {
                    if (mockFileReader.onload) {
                        mockFileReader.onload({ target: { result: mockFileReader.result } });
                    }
                }, 0);
            }),
            onload: null,
            onerror: null,
            result: null
        };

        service = new (class {
            readFileContent(file: File): Promise<string> {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve((e.target as FileReader).result as string);
                    reader.onerror = (e) => reject(e);
                    reader.readAsText(file);
                });
            }
        })();

        spyOn(window as any, 'FileReader').and.returnValue(mockFileReader);
    });

    it('should resolve with file content on successful read', async () => {
        const file = new File(['{"name":"MIT"}'], 'test.json', { type: 'application/json' });
        mockFileReader.result = '{"name":"MIT"}';

        const result = await service.readFileContent(file);

        expect(result).toBe('{"name":"MIT"}');
        expect(mockFileReader.readAsText).toHaveBeenCalledWith(file);
    });

    it('should handle empty file content', async () => {
        const file = new File([''], 'empty.txt', { type: 'text/plain' });
        mockFileReader.result = '';

        const result = await service.readFileContent(file);

        expect(result).toBe('');
    });

    it('should handle invalid file type gracefully', async () => {
        const file = new File(['<svg></svg>'], 'image.svg', { type: 'image/svg+xml' });
        mockFileReader.result = '<svg></svg>';

        const result = await service.readFileContent(file);

        expect(result).toBe('<svg></svg>');
    });

    it('should reject on file read error', async () => {
        const file = new File(['bad'], 'bad.txt', { type: 'text/plain' });

        mockFileReader.readAsText.and.callFake(() => {
            setTimeout(() => {
                if (mockFileReader.onerror) {
                    mockFileReader.onerror(new Error('File read failed'));
                }
            }, 0);
        });

        await expectAsync(service.readFileContent(file)).toBeRejectedWithError('File read failed');
    });
});


describe('CodeGeneratorService', () => {
    let service: CodeGeneratorService;
    let mockFile: File;
    let mockFileReader: Partial<FileReader>;
    let mockGoogleGenAI: any;

    beforeEach(() => {
        mockGoogleGenAI = {
            models: {
                generateContent: jasmine.createSpy().and.callFake(async (params: any) => ({
                    text: `
            <html_code><div>Hello World</div></html_code>
            <js_code>console.log('Hello');</js_code>
            <css_code>div { color: red; }</css_code>
          `
                }))
            }
        };

        // Override global FileReader
        mockFileReader = {
            readAsText: jasmine.createSpy(),
            result: '{"title":"Test"}'
        };

        spyOn(window as any, 'FileReader').and.returnValue(mockFileReader);

        // Inject mock GoogleGenAI
        (window as any).GoogleGenAI = function () {
            return mockGoogleGenAI;
        };

        service = new CodeGeneratorService();
        mockFile = new File(['{"title":"Test"}'], 'test.json', { type: 'application/json' });
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });


    it('should throw error if response is missing code blocks', () => {
        const badResponse = `<html_code><div></div></html_code>`; // missing js and css
        expect(() => (service as any).parseCodeBlocks(badResponse)).toThrowError(
            /Could not extract all HTML, JS, and CSS blocks/
        );
    });

    it('should parse code blocks correctly with all tags', () => {
        const response = `
      <html_code><div>Test</div></html_code>
      <js_code>console.log('Test');</js_code>
      <css_code>div { font-size: 14px; }</css_code>
    `;
        const result = (service as any).parseCodeBlocks(response);
        expect(result.html).toContain('<div>Test</div>');
        expect(result.javascript).toContain("console.log('Test')");
        expect(result.css).toContain('font-size: 14px');
    });
});
