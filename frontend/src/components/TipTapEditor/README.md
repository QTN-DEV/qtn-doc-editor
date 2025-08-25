# TipTap Editor Component

## Fitur yang Diimplementasikan

### 1. Indentation System
- **Keyboard Shortcuts**: 
  - `Tab` - Indent paragraph/heading
  - `Shift+Tab` - Outdent paragraph/heading
- **Toolbar Buttons**: Tombol indent/outdent di toolbar
- **Visual Indicators**: Border kiri dengan warna berbeda untuk setiap level indent
- **List Support**: Otomatis menggunakan `sinkListItem`/`liftListItem` untuk list items

### 2. Image Resize System
- **Click to Select**: Klik gambar untuk menampilkan resize handles
- **Resize Handles**: 4 handles di setiap sudut (nw, ne, sw, se)
- **Aspect Ratio**: Mempertahankan aspect ratio saat resize
- **Minimum Size**: Minimal 100px untuk mencegah gambar terlalu kecil
- **Paste Support**: Ctrl+V untuk paste gambar dari clipboard

### 3. Multi-tab Editor
- **Tab Management**: Buka multiple file dalam tab
- **Unsaved Changes**: Indikator * untuk file yang belum disimpan
- **Auto-save**: Ctrl+S untuk save file
- **Tab Close**: Konfirmasi jika ada perubahan yang belum disimpan

### 4. Rich Text Features
- **Formatting**: Bold, Italic, Strike, Highlight
- **Headings**: H1, H2, H3
- **Lists**: Bullet dan numbered lists
- **Alignment**: Left, Center, Right, Justify
- **Code Blocks**: Syntax highlighting
- **Blockquotes**: Quote styling
- **Links**: Auto-detection dan styling

## Cara Penggunaan

### Indentation
1. **Keyboard**: Tekan `Tab` untuk indent, `Shift+Tab` untuk outdent
2. **Toolbar**: Klik tombol indent/outdent di toolbar
3. **Lists**: Otomatis menggunakan list indentation untuk list items

### Image Management
1. **Upload**: Klik tombol image di toolbar atau drag & drop
2. **Paste**: Ctrl+V untuk paste gambar dari clipboard
3. **Resize**: Klik gambar, lalu drag handles untuk resize
4. **Deselect**: Klik di luar gambar untuk menghilangkan handles

### File Management
1. **Open File**: File akan otomatis dibuka dalam tab baru
2. **Switch Tabs**: Klik tab untuk beralih antar file
3. **Save**: Ctrl+S atau klik tombol Save di toolbar
4. **Close Tab**: Klik X di tab untuk menutup file

## Technical Implementation

### Extensions
- `IndentableParagraph`: Paragraph dengan atribut indent
- `IndentableHeading`: Heading dengan atribut indent  
- `Indentation`: Keyboard shortcuts dan commands untuk indent/outdent

### CSS Features
- Smooth transitions untuk indent changes
- Visual border indicators untuk setiap level indent
- Responsive design untuk mobile
- Custom styling untuk semua editor elements

### State Management
- Tab state dengan active tab tracking
- Modified files tracking dengan visual indicators
- Word/character count
- Fullscreen mode support
