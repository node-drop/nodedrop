# Form Widget Demo Examples

This directory contains comprehensive examples demonstrating the nodeDrop Form Widget functionality.

## 📁 Files Overview

### 🏠 `index.html` - Auto-Initialize Demo
- **Purpose**: Demonstrates the simplest way to embed the form widget
- **Method**: Auto-initialization using data attributes
- **Features**:
  - Clean, shadcn-style design
  - Auto-initialization example
  - Manual initialization example
  - Live form demo container

### 🎛️ `manual.html` - Manual Control Demo
- **Purpose**: Shows programmatic control over the form widget
- **Method**: Manual initialization with JavaScript API
- **Features**:
  - Interactive configuration controls
  - Real-time code examples
  - Widget lifecycle management (init/update/destroy)
  - Status monitoring and error handling
  - Dynamic configuration updates

### 🎨 `themes.html` - Theme Showcase
- **Purpose**: Demonstrates different theme options and styling
- **Method**: Multiple widget instances with different themes
- **Features**:
  - Light, dark, and auto theme examples
  - Page theme switching
  - System preference detection
  - Side-by-side theme comparison

## 🚀 Getting Started

### Prerequisites
1. **Backend Server**: Ensure the nodeDrop backend is running on `http://localhost:4000`
2. **Frontend Server**: Start the frontend dev server with `npm run dev`
3. **Widget Build**: Build the form widget with `npm run build:widget:form`
4. **Widget Copy**: Copy widget to public directory with `npm run copy:widgets`

### Quick Setup
```bash
# In the frontend directory
npm run build:widgets:dev  # Builds and copies all widgets
npm run dev                # Starts the dev server
```

### Accessing Examples
- **Auto-Initialize**: `http://localhost:3001/examples/form-example/index.html`
- **Manual Control**: `http://localhost:3001/examples/form-example/manual.html`
- **Themes Demo**: `http://localhost:3001/examples/form-example/themes.html`

## 🔧 Configuration

### Auto-Initialization
Add this to your HTML:
```html
<!-- Basic setup -->
<div data-nd-form="your-form-id" 
     data-theme="auto"
     data-api-url="http://localhost:4000/api"></div>

<!-- Include the script -->
<script src="http://localhost:3001/widgets/form/nd-form-widget.umd.js"></script>
```

### Manual Initialization
```javascript
const widget = new nodeDropFormWidget();
widget.init({
    formId: 'your-form-id',
    apiUrl: 'http://localhost:4000/api',
    container: '#form-container',
    theme: 'light',
    onReady: () => console.log('Form ready!'),
    onSubmit: (data) => console.log('Form submitted:', data),
    onError: (error) => console.error('Form error:', error)
});
```

## 📋 Configuration Options

### Data Attributes (Auto-initialization)
- `data-nd-form`: **Required** - Your form workflow ID
- `data-theme`: Theme preference (`light`, `dark`, `auto`)
- `data-api-url`: Backend API URL (defaults to current origin + `/api`)
- `data-on-ready`: Global callback function name for ready event
- `data-on-submit`: Global callback function name for submit event
- `data-on-error`: Global callback function name for error event

### JavaScript API Options
```typescript
interface FormWidgetConfig {
    formId: string;              // Required: Form workflow ID
    apiUrl?: string;             // Backend API URL
    container?: string | HTMLElement; // Container selector or element
    theme?: 'light' | 'dark' | 'auto'; // Theme preference
    onReady?: () => void;        // Form ready callback
    onSubmit?: (data: any) => void; // Form submit callback
    onError?: (error: any) => void;  // Error callback
}
```

## 🎯 Use Cases

### 1. **Contact Forms**
- Lead capture forms
- Support ticket creation
- Newsletter signups

### 2. **Data Collection**
- Survey forms
- Registration forms
- Feedback collection

### 3. **Dynamic Forms**
- Multi-step workflows
- Conditional field display
- Real-time validation

## 🔍 Troubleshooting

### Common Issues

1. **Form not appearing**
   ```html
   <!-- Make sure the form ID exists in your backend -->
   <div data-nd-form="ca37729d-50bd-4d4d-bb3b-fa8d61e3bdd5"></div>
   ```

2. **Script not loading**
   ```bash
   # Rebuild and copy the widget
   npm run build:widgets:dev
   ```

3. **API connection issues**
   - Verify backend is running on port 4000
   - Check CORS settings
   - Ensure form workflow is published

### Debug Mode
Open browser console to see detailed logs:
- Form initialization status
- API request/response details
- Error messages and stack traces

## 📊 Browser Support

- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile**: iOS Safari 14+, Chrome Mobile 90+
- **Features**: ES6+, CSS Grid, Flexbox, CSS Custom Properties

## 🔗 Related Documentation

- [Form Widget API Reference](../../src/widgets/form/README.md)
- [Backend Form Endpoints](../../../backend/src/routes/public-forms.ts)
- [Widget Development Guide](../../docs/widget-development.md)

---

## 💡 Tips

1. **Testing**: Use the manual control demo to test different configurations
2. **Themes**: The auto theme respects user's system preference
3. **Callbacks**: Use callback functions to integrate with your application
4. **Styling**: The widget is designed to inherit your page's font family
5. **Performance**: Widget lazy-loads and bundles all dependencies

## 🤝 Contributing

When adding new examples:
1. Follow the existing naming convention
2. Include comprehensive error handling
3. Add status indicators for user feedback
4. Test across different themes and screen sizes
5. Update this README with new examples