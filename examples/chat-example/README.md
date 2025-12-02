# Chat Widget Demo Examples

This directory contains comprehensive examples demonstrating the nodeDrop Chat Widget functionality.

## 📁 Files Overview

### 🏠 `index.html` - Auto-Initialize Demo
- **Purpose**: Demonstrates the simplest way to embed the chat widget
- **Method**: Auto-initialization using data attributes
- **Features**:
  - Automatic widget loading on page load
  - Clean, modern landing page design
  - Feature showcase
  - Mobile-responsive design

### 🛠️ `manual.html` - Manual Control Demo
- **Purpose**: Shows full programmatic control over the chat widget
- **Method**: Manual initialization with JavaScript API
- **Features**:
  - Initialize/destroy widget controls
  - Open/close chat programmatically
  - Send test messages
  - Real-time event logging
  - Error handling demonstration

### 🎨 `themes.html` - Themes & Customization Demo
- **Purpose**: Interactive theme and position customization
- **Method**: Dynamic widget reconfiguration
- **Features**:
  - Live theme switching (light/dark/auto)
  - Position selection (4 corners)
  - Color customization
  - Real-time preview
  - Configuration display

## 🚀 Getting Started

### Prerequisites
1. **Backend Server**: Ensure your nodeDrop backend is running on `http://localhost:4000`
2. **Frontend Server**: Ensure your frontend is running on `http://localhost:3000`
3. **Active Workflow**: Have a workflow with a Chat node activated
4. **Chat Widget Script**: The widget script should be available at `http://localhost:3000/nd-chat-widget.umd.js`

### Setup Instructions

1. **Update Chat ID**: Replace the chat ID in all HTML files with your actual chat ID:
   ```html
   <!-- Replace this ID with your actual chat ID -->
   <div data-nd-chat="ca37729d-50bd-4d4d-bb3b-fa8d61e3bdd5"
   ```

2. **Verify URLs**: Ensure the API and script URLs match your setup:
   ```html
   <!-- API URL -->
   data-api-url="http://localhost:4000/api"
   
   <!-- Widget Script -->
   <script src="http://localhost:3000/widgets/chat/nd-chat-widget.umd.js"></script>
   ```

3. **Open Examples**: Open any HTML file in your browser to test the chat widget

## 📋 Usage Examples

### Auto-Initialize (Simplest)
```html
<!-- Add this div to your page -->
<div data-nd-chat="YOUR_CHAT_ID" 
     data-api-url="http://localhost:4000/api"
     data-theme="light"
     data-position="bottom-right"></div>

<!-- Include the script -->
<script src="http://localhost:3000/widgets/chat/nd-chat-widget.umd.js"></script>
```

### Manual Initialize (Full Control)
```html
<!-- Load the script first -->
<script src="http://localhost:3000/widgets/chat/nd-chat-widget.umd.js"></script>

<!-- Then initialize -->
<script>
const widget = new window.nodeDropChatWidget();

widget.init({
  chatId: 'YOUR_CHAT_ID',
  apiUrl: 'http://localhost:4000/api',
  theme: 'light',
  position: 'bottom-right',
  onMessage: (message) => console.log('User:', message),
  onResponse: (response) => console.log('AI:', response),
  onError: (error) => console.error('Error:', error)
});
</script>
```

## 🎯 Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `chatId` | string | required | Your chat workflow ID |
| `apiUrl` | string | required | Backend API URL |
| `theme` | string | 'light' | 'light', 'dark', or 'auto' |
| `position` | string | 'bottom-right' | Widget position on page |
| `bubbleColor` | string | '#3b82f6' | Chat bubble background color |
| `headerColor` | string | '#1f2937' | Chat header background color |

## 🎨 Available Themes

- **Light**: Clean, bright interface
- **Dark**: Modern dark theme
- **Auto**: Adapts to system preference

## 📍 Available Positions

- `bottom-right` (default)
- `bottom-left`
- `top-right`
- `top-left`

## 🔧 Troubleshooting

### Common Issues

1. **Widget Not Loading**
   - Check if the script URL is accessible
   - Verify the chat ID is correct
   - Ensure the backend server is running

2. **API Errors**
   - Verify the API URL is correct
   - Check if the workflow is activated
   - Ensure the chat node is properly configured

3. **Theme Not Applying**
   - Check browser console for errors
   - Verify the theme value is valid
   - Try refreshing the page

### Debug Mode

Add this to your page to enable debug logging:
```javascript
window.nodeDrop_CHAT_DEBUG = true;
```

## 📱 Mobile Support

All examples are fully responsive and work on:
- Desktop browsers
- Tablets
- Mobile phones
- Touch devices

## 🔗 Integration Tips

1. **WordPress**: Copy the auto-initialize code to your theme's footer
2. **React/Vue**: Use the manual initialization method in a component
3. **Static Sites**: Use the auto-initialize method in your HTML
4. **E-commerce**: Position the widget to not interfere with checkout flows

## 📊 Analytics & Tracking

Use the callback functions to track user interactions:

```javascript
widget.init({
  // ... other options
  onMessage: (message) => {
    // Track user messages
    gtag('event', 'chat_message_sent', {
      message_length: message.length
    });
  },
  onResponse: (response) => {
    // Track AI responses
    gtag('event', 'chat_response_received');
  }
});
```

## 🚀 Next Steps

1. Customize the examples for your use case
2. Test with your actual chat workflows
3. Deploy to your website
4. Monitor chat interactions and optimize

For more advanced customization, refer to the main documentation or explore the widget source code.