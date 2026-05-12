# LedgerLeaf Implementation Plan

## Overview

This document outlines the comprehensive implementation plan for LedgerLeaf, a fully local-first recurring expenses and obligations management application.

## Current Status

- **Architecture**: React/TypeScript with localStorage storage
- **Compliance**: 70% aligned with specification requirements
- **Critical Issue**: Storage architecture mismatch (localStorage vs filesystem YAML files)
- **Decision**: PWA implementation instead of Tauri for cross-platform compatibility

## Completed Features

✅ **Dashboard with summaries and analytics**
- Monthly recurring totals
- Upcoming payments visualization
- Potentially unused services identification
- Category breakdowns

✅ **Full expense CRUD with validation**
- Comprehensive expense editor with all required fields
- Zod schema validation matching specification
- Real-time search and filtering
- Spreadsheet-style inventory table

✅ **Calendar view with due date tracking**
- Monthly navigation
- Due date visualization
- Expense details on date selection
- Monthly totals and payment days

✅ **Basic notification system**
- Browser notification integration
- Payment due reminders
- Usage tracking reminders
- Notification history

✅ **Search and filtering functionality**
- Text search across names, notes, and tags
- Category, status, frequency filtering
- Sortable columns
- Real-time filter application

✅ **Comprehensive data schemas (Zod)**
- Complete expense schema matching specification
- Configuration schema
- Import/export type definitions
- Runtime validation

## Critical Missing Features

❌ **Filesystem-based YAML storage**
- Current: localStorage-based storage
- Required: One YAML file per expense in `/app-data/expenses/`
- Missing: Human-readable file structure

❌ **PWA implementation**
- Missing: Service worker for offline functionality
- Missing: Web app manifest for installability
- Missing: File System Access API integration

❌ **Import wizard completion**
- Basic file parsing implemented
- Missing: Field mapping interface
- Missing: Actual expense creation from import
- Missing: Recurring detection algorithms

❌ **Export system completion**
- Basic CSV export in storage layer
- Missing: XLSX export implementation
- Missing: Export UI with format selection
- Missing: Custom export templates

❌ **Settings panel implementation**
- Component exists but no functionality
- Missing: Configuration management UI
- Missing: User preferences
- Missing: Data directory selection

## Implementation Phases

### Phase 1: Storage Architecture (Weeks 1-2)

**Priority: CRITICAL**

#### PWA Foundation
- [ ] Add service worker for offline functionality
- [ ] Create manifest.json for installability
- [ ] Implement File System Access API for desktop browsers
- [ ] Add IndexedDB fallback for mobile browsers

#### Filesystem Storage Layer
- [ ] Replace localStorage with File System Access API
- [ ] Implement YAML file-per-expense storage
- [ ] Create app-data directory structure:
  ```
  /app-data/
    /expenses/
      netflix.yml
      electricity.yml
      gym-membership.yml
    /exports/
    /imports/
    config.yml
  ```
- [ ] Add file watching for external changes
- [ ] Implement data migration from localStorage

#### Storage Service Refactor
- [ ] Update StorageService to use filesystem
- [ ] Add file validation and error handling
- [ ] Implement atomic file operations
- [ ] Add backup/restore functionality

### Phase 2: Import/Export Completion (Weeks 3-4)

**Priority: HIGH**

#### Import Wizard Enhancement
- [ ] Implement field mapping interface
  - [ ] Column detection and preview
  - [ ] Drag-and-drop field mapping
  - [ ] Field validation and transformation
- [ ] Add recurring detection algorithms
  - [ ] Vendor pattern recognition
  - [ ] Amount similarity detection
  - [ ] Date interval analysis
- [ ] Create expense preview and editing
- [ ] Add import validation and error reporting

#### Export System
- [ ] Implement XLSX export with SheetJS
- [ ] Create export UI with format selection
- [ ] Add export templates and customization
- [ ] Implement scheduled exports
- [ ] Add export history management

#### Spreadsheet Integration
- [ ] Add support for multiple sheet formats
- [ ] Implement column auto-detection
- [ ] Add data transformation rules
- [ ] Create import templates

### Phase 3: Settings & Configuration (Weeks 5-6)

**Priority: MEDIUM**

#### Settings Panel Implementation
- [ ] Create comprehensive settings UI
  - [ ] Currency and locale settings
  - [ ] Notification preferences
  - [ ] Data directory selection
  - [ ] Theme customization
- [ ] Add settings validation and persistence
- [ ] Implement settings reset functionality

#### Configuration Management
- [ ] Implement config.yaml storage
- [ ] Add settings validation
- [ ] Create backup/restore settings
- [ ] Add reset to defaults
- [ ] Implement settings migration

#### User Preferences
- [ ] Add theme customization (light/dark mode)
- [ ] Implement dashboard widgets configuration
- [ ] Create keyboard shortcuts
- [ ] Add local usage analytics (privacy-first)

### Phase 4: Enhanced Features (Weeks 7-8)

**Priority: LOW**

#### Calendar Improvements
- [ ] Add recurring pattern visualization
- [ ] Implement multi-month view
- [ ] Add drag-and-drop rescheduling
- [ ] Create calendar export functionality
- [ ] Add calendar integration (Google Calendar, etc.)

#### Notification Enhancements
- [ ] Add snooze functionality
- [ ] Implement notification grouping
- [ ] Create notification history UI
- [ ] Add custom notification sounds
- [ ] Implement notification scheduling improvements

#### Advanced Filtering
- [ ] Implement date range filtering
- [ ] Add saved filter presets
- [ ] Create advanced search UI
- [ ] Add filter combinations and logic
- [ ] Implement filter sharing

## Technical Approach

### Storage Strategy
- **Primary**: File System Access API for desktop browsers
- **Fallback**: IndexedDB for mobile browsers
- **Format**: YAML files per expense as specified
- **Structure**: Human-readable directory structure

### Architecture Decisions
1. **PWA over Tauri**: Maintains existing React/TypeScript architecture
2. **Progressive Enhancement**: Core functionality works everywhere, advanced features where supported
3. **Offline-First**: Service worker with strategic caching
4. **Data Portability**: Human-readable YAML format for easy backup and migration

### Browser Compatibility
- **Desktop**: Chrome, Edge, Safari (with File System Access API)
- **Mobile**: Progressive Web App with IndexedDB storage
- **Fallback**: Basic functionality in all modern browsers

## Success Metrics

### Functional Requirements
- [ ] 100% specification compliance
- [ ] Human-readable file storage
- [ ] Offline-first functionality
- [ ] Cross-platform compatibility
- [ ] Complete import/export functionality

### Performance Requirements
- [ ] <100ms local interactions
- [ ] Instant local startup
- [ ] Low memory usage
- [ ] Minimal background processing

### User Experience Requirements
- [ ] Native app-like experience
- [ ] Intuitive import/export workflow
- [ ] Comprehensive settings management
- [ ] Responsive design for all devices

## Risk Assessment

### Technical Risks
- **File System Access API**: Limited browser support
  - **Mitigation**: IndexedDB fallback for mobile
- **PWA Limitations**: Some features may not work on all platforms
  - **Mitigation**: Progressive enhancement approach

### Implementation Risks
- **Data Migration**: Potential data loss during localStorage to filesystem migration
  - **Mitigation**: Comprehensive backup and testing procedures
- **Browser Compatibility**: Feature detection and fallback implementation complexity
  - **Mitigation**: Incremental rollout and extensive testing

## Timeline Summary

| Phase | Duration | Priority | Key Deliverables |
|-------|----------|----------|-----------------|
| Phase 1 | 2 weeks | Critical | PWA foundation, filesystem storage |
| Phase 2 | 2 weeks | High | Complete import/export system |
| Phase 3 | 2 weeks | Medium | Settings and configuration |
| Phase 4 | 2 weeks | Low | Enhanced features and polish |

**Total Estimated Time: 8 weeks**

## Next Steps

1. **Immediate**: Begin Phase 1 implementation with PWA foundation
2. **Week 1**: Implement service worker and File System Access API integration
3. **Week 2**: Complete storage migration and testing
4. **Week 3**: Start import wizard enhancement
5. **Continuous**: Regular testing and user feedback integration

This implementation plan ensures LedgerLeaf will fully meet the specification requirements while maintaining code quality and user experience standards.
