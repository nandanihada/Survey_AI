# Survey Edit Feature Guide

## Overview
The survey edit feature allows users to modify existing surveys through a user-friendly web interface. This guide explains how to use the edit functionality and troubleshoot common issues.

## How to Use the Edit Feature

### 1. Access the Survey List
- Navigate to the **Surveys** tab in the main dashboard
- You'll see a list of all your created surveys

### 2. Edit a Survey
- Click the **Edit** button (pencil icon) next to any survey
- You'll be redirected to the survey editor page (`/edit/{survey_id}`)

### 3. Survey Editor Features
- **Survey Settings**: Edit title and description
- **Questions**: Add, edit, delete, and reorder questions
- **Question Types**: Support for multiple choice, rating, yes/no, short answer, etc.
- **Live Preview**: See changes in real-time
- **Auto-save**: Changes are automatically saved
- **Undo/Redo**: Use Ctrl+Z/Ctrl+Y for quick changes

### 4. Keyboard Shortcuts
- `Ctrl+S` - Save survey
- `Ctrl+Z` - Undo
- `Ctrl+Y` or `Ctrl+Shift+Z` - Redo
- `?` - Show/hide keyboard shortcuts

## Technical Details

### Frontend Components
- **SurveyList.tsx**: Displays surveys with edit buttons
- **SurveyEditor.tsx**: Full-featured survey editor
- **App.tsx**: Routes configuration

### Backend Endpoints
- `GET /surveys` - List all surveys
- `GET /survey/{id}/view` - Get specific survey
- `PUT /survey/{id}/edit` - Update survey

### API Usage
```javascript
// Update a survey
fetch(`/survey/${surveyId}/edit`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(updatedSurvey)
})
```

## Fixed Issues

### 1. SurveyList.tsx Syntax Errors
- **Problem**: Multiple syntax errors including duplicate functions and missing return statements
- **Fix**: Completely rewrote the component with proper React hooks and navigation

### 2. CSS Import Order
- **Problem**: Tailwind CSS imports were conflicting with Google Fonts
- **Fix**: Moved font imports before Tailwind directives

### 3. Backend Survey ID Handling
- **Problem**: Edit endpoint wasn't properly handling different ID formats
- **Fix**: Added support for both `_id` and `id` fields with proper ObjectId conversion

### 4. Navigation Issues
- **Problem**: Edit button wasn't properly navigating to editor
- **Fix**: Added proper React Router navigation with `useNavigate` hook

## Development Setup

### Prerequisites
- Node.js and npm installed
- Python 3.x with Flask
- MongoDB database

### Running the Application
1. **Backend**:
   ```bash
   cd Backend
   python app.py
   ```

2. **Frontend**:
   ```bash
   cd project
   npm install
   npm run dev
   ```

3. **Access the app**:
   - Frontend: http://localhost:5173
   - Backend: http://localhost:5000

## Testing
The edit functionality has been tested with:
- ✅ Survey list loading
- ✅ Edit button navigation
- ✅ Survey editor loading
- ✅ Survey updates via API
- ✅ Real-time preview
- ✅ Question manipulation

## Troubleshooting

### Common Issues
1. **"Survey not found" error**: Check if survey ID exists in database
2. **Edit button not working**: Ensure React Router is properly configured
3. **Changes not saving**: Verify backend connection and API endpoints
4. **TypeScript errors**: Check component prop types and interfaces

### Debug Steps
1. Check browser console for JavaScript errors
2. Verify backend logs for API errors
3. Test API endpoints directly using curl or Postman
4. Ensure database connection is working

## Future Enhancements
- Drag-and-drop question reordering
- Question templates
- Bulk question operations
- Survey versioning
- Collaborative editing
- Export/import functionality

## Support
For issues or questions, check:
1. Browser console for errors
2. Backend logs for API issues
3. Network tab for request/response debugging
4. This documentation for common solutions
