/**
 * Google Sheets Integration - Versi Robust dan Error-Resistant
 * File ini menggabungkan semua solusi sebelumnya dengan peningkatan error handling
 */

class GoogleSheetsIntegration {
    constructor() {
        this.spreadsheetId = '15Yu8_PcUFvrQFIL3qy7TfvDJNg4XPSbqPJOU6Wh8Q1A';
        this.apiKey = 'AIzaSyDiLgnSz4yrRr1AW-dHgvEDSyZS6aGFiZY';
        this.sheetName = 'REKAP CALON PELANGGAN BY SPARTA';
        this.data = [];
        this.originalData = [];
        this.isInitialized = false;
        this.retryCount = 0;
        this.maxRetries = 3;
        
        console.log('🚀 Google Sheets Integration initialized');
        this.init();
    }

    async init() { // Make init() async
        console.log('🔧 Starting Google Sheets integration...');

        return new Promise(resolve => { // Return a Promise
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', async () => {
                    await this.setup();
                    resolve(); // Resolve the promise after setup
                });
            } else {
                this.setup().then(() => resolve()); // Resolve after setup
            }
        });
    }

    async setup() {
        try {
            // Validasi konfigurasi
            if (!this.checkConfiguration()) {
                this.loadFallbackData();
                return;
            }

            // Setup UI elements
            this.setupUIElements();
            
            // Load data dari Google Sheets
            await this.loadData();
            
        } catch (error) {
            console.error('❌ Setup error:', error);
            this.showError('Gagal menginisialisasi Google Sheets: ' + error.message);
            this.loadFallbackData();
        }
    }

    checkConfiguration() {
        if (!this.spreadsheetId || !this.apiKey) {
            console.error('❌ Configuration incomplete');
            this.showError('Konfigurasi Google Sheets tidak lengkap');
            return false;
        }

        // Validasi format spreadsheet ID
        const spreadsheetIdPattern = /^[a-zA-Z0-9-_]+$/;
        if (!spreadsheetIdPattern.test(this.spreadsheetId)) {
            console.error('❌ Invalid spreadsheet ID format');
            return false;
        }

        console.log('✅ Configuration valid');
        return true;
    }

    setupUIElements() {
        // Pastikan tabel ada
        const table = document.getElementById('customerTable');
        if (!table) {
            console.error('❌ Customer table not found');
            return false;
        }

        // Setup loading indicator
        this.createLoadingIndicator();
        
        // Setup error display
        this.createErrorDisplay();
        
        return true;
    }

    createLoadingIndicator() {
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'loadingIndicator';
        loadingDiv.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div class="spinner"></div>
                <p>Memuat data dari Google Sheets...</p>
            </div>
        `;
        
        const tbody = document.querySelector('#customerTable tbody');
        if (tbody) {
            tbody.innerHTML = '';
            tbody.appendChild(loadingDiv);
        }
    }

    createErrorDisplay() {
        const errorDiv = document.createElement('div');
        errorDiv.id = 'errorDisplay';
        errorDiv.style.display = 'none';
        errorDiv.className = 'error-message';
        document.body.appendChild(errorDiv);
    }

    async loadData() {
        try {
            this.showLoading(true);
            console.log('🔄 Loading data from Google Sheets...');

            const url = this.buildApiUrl();
            console.log('🔗 API URL:', url);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('✅ Raw data received:', data);

            if (data.error) {
                throw new Error(data.error.message || 'Google Sheets API error');
            }

            if (!data.values || data.values.length === 0) {
                console.warn('⚠️ No data found in spreadsheet');
                this.showWarning('Tidak ada data di Google Sheets');
                this.loadFallbackData();
                return;
            }

            this.processData(data.values);
            this.isInitialized = true;
            this.showLoading(false);

        } catch (error) {
            console.error('❌ Load data error:', error);
            this.handleLoadError(error);
        }
    }

    buildApiUrl() {
        const encodedSheetName = encodeURIComponent(this.sheetName);
        const range = `${encodedSheetName}!A1:I1000`;
        return `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${range}?key=${this.apiKey}`;
    }

    processData(rawData) {
        try {
            console.log('📊 Processing data...', rawData.length, 'rows');
            
            if (!rawData || rawData.length === 0) {
                throw new Error('No data to process');
            }

            // Simpan data asli
            this.data = rawData;
            
            // Proses data untuk tabel (skip header)
            this.originalData = rawData.slice(1).map((row, index) => {
                // Ensure row has enough elements, provide empty string if not
                const getVal = (arr, idx) => this.sanitizeValue(arr[idx] || '');

                return {
                    id: index + 1,
                    odp_terdekat: getVal(row, 0),
                    nama: getVal(row, 1),
                    alamat: getVal(row, 2),
                    no_telepon: getVal(row, 3),
                    nama_sales: getVal(row, 4),
                    visit: getVal(row, 5),
                    keterangan: getVal(row, 6),
                    status: getVal(row, 7),
                    keterangan_tambahan: getVal(row, 8)
                };
            }).filter(row => row.nama || row.no_telepon); // Filter baris kosong

            console.log('✅ Processed data:', this.originalData.length, 'valid rows');
            
            this.renderTable();
            this.updateSalesList();
            this.updateStats();
            this.updateSalesDropdown();

        } catch (error) {
            console.error('❌ Process data error:', error);
            this.showError('Gagal memproses data: ' + error.message);
        }
    }

    createEmptyRow(index) {
        return {
            id: index + 1,
            odp_terdekat: '',
            nama: '',
            alamat: '',
            no_telepon: '',
            nama_sales: '',
            visit: '',
            keterangan: '',
            status: '',
            keterangan_tambahan: '' // Added this line
        };
    }

    sanitizeValue(value) {
        return value ? String(value).trim() : '';
    }

    renderTable(filteredData = null) {
        try {
            const tbody = document.querySelector('#customerTable tbody');
            if (!tbody) {
                throw new Error('Table body not found');
            }

            const dataToRender = filteredData || this.originalData;
            
            if (dataToRender.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="10" style="text-align: center; padding: 40px;">
                            <i class="fas fa-inbox" style="font-size: 48px; color: #ccc; margin-bottom: 10px;"></i>
                            <br>
                            <strong>Tidak ada data</strong>
                            <br>
                            <small>Data akan muncul otomatis saat tersedia di Google Sheets</small>
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = '';
            
            dataToRender.forEach((row, index) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>
                        <input type="checkbox" class="row-checkbox" data-index="${index}" 
                               onchange="googleSheetsIntegration.updateSelectedCount()" />
                    </td>
                    <td>${this.escapeHtml(row.odp_terdekat)}</td>
                    <td>${this.escapeHtml(row.nama)}</td>
                    <td><button class="btn-shareloc" onclick="window.open('${this.escapeHtml(row.alamat)}', '_blank')">Lihat Lokasi</button></td>
                    <td>${this.escapeHtml(row.no_telepon)}</td>
                    <td>${this.escapeHtml(row.nama_sales)}</td>
                    <td><span class="badge ${this.getVisitBadgeClass(row.visit)}">${this.escapeHtml(row.visit)}</span></td>
                    <td>${this.escapeHtml(row.keterangan)}</td>
                    <td><span class="status ${this.getStatusClass(row.status)}">${this.escapeHtml(row.status)}</span></td>
                    <td>${this.escapeHtml(row.keterangan_tambahan)}</td>
                    <td>
                        <button class="btn-icon" title="Edit" onclick="googleSheetsIntegration.editRow(${index})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon" title="Delete" onclick="googleSheetsIntegration.deleteRow(${index})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

        } catch (error) {
            console.error('❌ Render table error:', error);
            this.showError('Gagal menampilkan data: ' + error.message);
        }
    }

    updateSalesList() {
        try {
            const salesList = document.querySelector('.sales-list');
            if (!salesList) return;

            const salesNames = [...new Set(this.originalData
                .map(row => row.nama_sales)
                .filter(name => name && name.trim() && name.toLowerCase() !== 'overview'))].sort();

            console.log('📋 Sales list:', salesNames);

            // Clear existing content
            salesList.innerHTML = '';

            

            // Add sales items
            salesNames.forEach(name => {
                const li = document.createElement('li');
                li.className = 'sales-item';
                li.dataset.salesName = name;
                li.innerHTML = `
                    <span>${name}</span>
                `;
                li.onclick = () => this.filterBySales(name);
                salesList.appendChild(li);
            });

        } catch (error) {
            console.error('❌ Update sales list error:', error);
        }
    }

    updateStats() {
        try {
            const totalCustomersElement = document.getElementById('totalCustomers');
            if (totalCustomersElement) {
                totalCustomersElement.textContent = this.originalData.length;
            }
        } catch (error) {
            console.error('❌ Update stats error:', error);
        }
    }

    

    updateSalesDropdown() {
        try {
            const salesSelects = document.querySelectorAll('#inputSales, #editSales');
            const salesNames = [...new Set(this.originalData
                .map(row => row.nama_sales)
                .filter(name => name && name.trim()))].sort();

            salesSelects.forEach(select => {
                // Only proceed if it's a select element
                if (select.tagName !== 'SELECT') {
                    return;
                }

                const currentValue = select.value;
                select.innerHTML = '<option value="">Pilih Sales</option>';
                
                salesNames.forEach(name => {
                    const option = document.createElement('option');
                    option.value = name;
                    option.textContent = name;
                    select.appendChild(option);
                });

                if (salesNames.includes(currentValue)) {
                    select.value = currentValue;
                }
            });

        } catch (error) {
            console.error('❌ Update sales dropdown error:', error);
        }
    }

    filterBySales(salesName) {
        try {
            console.log('🔍 Filtering by sales:', salesName);
            
            // Update active state
            document.querySelectorAll('.sales-item').forEach(item => {
                item.classList.remove('active');
            });

            if (salesName === 'All') {
                this.renderTable();
                document.getElementById('overview-btn')?.classList.add('active');
            } else {
                const filteredData = this.originalData.filter(row => 
                    row.nama_sales === salesName
                );
                this.renderTable(filteredData);
                
                const targetItem = document.querySelector(`[data-sales-name="${salesName}"]`);
                if (targetItem) targetItem.classList.add('active');
            }

        } catch (error) {
            console.error('❌ Filter error:', error);
        }
    }

    handleLoadError(error) {
        console.error('❌ Load error details:', error);
        
        if (error.message.includes('403') || error.message.includes('quota')) {
            this.showError('Kuota Google Sheets API telah terpakai. Menggunakan data fallback.');
        } else if (error.message.includes('404')) {
            this.showError('Spreadsheet tidak ditemukan. Periksa spreadsheet ID.');
        } else if (error.message.includes('401') || error.message.includes('403')) {
            this.showError('Akses ditolak. Periksa API key dan permissions.');
        } else {
            this.showError('Gagal memuat data: ' + error.message);
        }
        
        this.loadFallbackData();
    }

    loadFallbackData() {
        console.log('🔄 Loading fallback data for testing...');
        
        const fallbackData = [
            ['ODP', 'NAMA', 'ALAMAT', 'NO TELEPON', 'NAMA SALES', 'VISIT', 'KETERANGAN', 'STATUS'],
            ['ODP-BDG-001', 'Budi Santoso', 'Jl. Merdeka No.1, Bandung', '081234567890', 'Nandi', 'Visited', 'Sudah follow up, tertarik paket 100Mbps', 'Diterima'],
            ['ODP-BDG-002', 'Siti Nurhaliza', 'Jl. Sudirman No.2, Bandung', '082345678901', 'Andi', 'Pending', 'Menunggu konfirmasi dari keluarga', 'Diterima'],
            ['ODP-BDG-003', 'Ahmad Dahlan', 'Jl. Gatot Subroto No.3', '083456789012', 'Yandi', 'Not Visited', 'Belum dihubungi, nomor tidak aktif', 'Pending'],
            ['ODP-BDG-004', 'Rina Marlina', 'Jl. Asia Afrika No.4', '084567890123', 'April', 'Scheduled', 'Janji ketemu hari Rabu jam 14:00', 'Diterima'],
            ['ODP-BDG-005', 'Dedi Kurniawan', 'Jl. Cihampelas No.5', '085678901234', 'Octa', 'Visited', 'Sudah survey lokasi, oke untuk instalasi', 'Diterima']
        ];
        
        this.processData(fallbackData);
        this.showWarning('Menggunakan data demo. Koneksi ke Google Sheets sedang bermasalah.');
    }

    async refreshData() {
        console.log('🔄 Refreshing data...');
        this.retryCount = 0;
        await this.loadData();
    }

    // Utility functions
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    getVisitBadgeClass(visit) {
        if (!visit) return 'badge-secondary';
        const visitLower = visit.toLowerCase();
        if (visitLower.includes('visited')) return 'badge-success';
        if (visitLower.includes('pending')) return 'badge-warning';
        if (visitLower.includes('scheduled')) return 'badge-info';
        return 'badge-secondary';
    }

    getStatusClass(status) {
        if (!status) return 'status-secondary';
        const statusLower = status.toLowerCase();
        if (statusLower.includes('diterima')) return 'status-diterima';
        if (statusLower.includes('tidak diterima')) return 'status-tidak-diterima';
        return 'status-secondary';
    }

    showLoading(show) {
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = show ? 'block' : 'none';
        }
    }

    showError(message) {
        console.error('❌', message);
        this.showMessage(message, 'error');
    }

    showWarning(message) {
        console.warn('⚠️', message);
        this.showMessage(message, 'warning');
    }

    showMessage(message, type = 'info') {
        const errorDisplay = document.getElementById('errorDisplay');
        if (errorDisplay) {
            errorDisplay.innerHTML = `
                <div class="alert alert-${type}" style="margin: 20px; padding: 15px; border-radius: 5px;">
                    <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : 'info-circle'}"></i>
                    ${message}
                    <button onclick="this.parentElement.parentElement.style.display='none'" 
                            style="float: right; background: none; border: none; font-size: 20px;">
                        &times;
                    </button>
                </div>
            `;
            errorDisplay.style.display = 'block';
        }
    }

    // CRUD operations
    editRow(index) {
        console.log('✏️ Edit row:', index);
        const rowData = this.originalData[index];
        if (rowData) {
            // Populate the edit form with existing data
            document.getElementById('editRowIndex').value = index;
            document.getElementById('editOdp').value = rowData.odp_terdekat || '';
            document.getElementById('editNama').value = rowData.nama || '';
            document.getElementById('editAlamat').value = rowData.alamat || '';
            document.getElementById('editTelepon').value = rowData.no_telepon || '';
            document.getElementById('editSales').value = rowData.nama_sales || '';
            document.getElementById('editVisit').value = rowData.visit || '';
            document.getElementById('editKeterangan').value = rowData.keterangan || '';
            document.getElementById('editStatus').value = rowData.status || '';
            document.getElementById('editKeteranganTambahan').value = rowData.keterangan_tambahan || '';
            
            // Update sales dropdown options
            this.updateSalesDropdown();
            
            // Show the modal
            document.getElementById('editModal').style.display = 'block';
        }
    }

    async saveEdit() {
        try {
            const index = document.getElementById('editRowIndex').value;
            const rowToUpdate = parseInt(index) + 2; // +1 for header, +1 for 1-based index
            
            const values = [
                [
                    document.getElementById('editOdp').value,
                    document.getElementById('editNama').value,
                    document.getElementById('editAlamat').value,
                    document.getElementById('editTelepon').value,
                    document.getElementById('editSales').value,
                    document.getElementById('editVisit').value,
                    document.getElementById('editKeterangan').value,
                    document.getElementById('editStatus').value,
                    document.getElementById('editKeteranganTambahan').value
                ]
            ];

            const sheetName = this.sheetName;
            const range = `${sheetName}!A${rowToUpdate}:I${rowToUpdate}`;

            const request = {
                spreadsheetId: this.spreadsheetId,
                range: range,
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: values
                }
            };

            await gapi.client.sheets.spreadsheets.values.update(request);

            console.log('✅ Row updated successfully in Google Sheets');
            this.showMessage('Data berhasil diperbarui!', 'success');
            this.closeEditModal();
            this.refreshData();

        } catch (error) {
            console.error('❌ Update row error:', error);
            this.showError('Gagal memperbarui data: ' + error.message);
        }
    }

    closeEditModal() {
        // Use the global closeEditModal function from script.js
        if (typeof closeEditModal === 'function') {
            closeEditModal();
        } else {
            // Fallback if script.js function is not available
            const editModal = document.getElementById('editModal');
            if (editModal) {
                editModal.classList.remove('show');
            }
        }
    }

    async deleteRow(index) {
        console.log('🗑️ Delete row:', index);
        if (confirm('Apakah Anda yakin ingin menghapus data ini?')) {
            try {
                const rowToDelete = index + 2; // +1 for header, +1 for 1-based index
                const sheetName = this.sheetName;

                const request = {
                    spreadsheetId: this.spreadsheetId,
                    resource: {
                        requests: [
                            {
                                deleteDimension: {
                                    range: {
                                        sheetId: 0, // Assuming the first sheet
                                        dimension: 'ROWS',
                                        startIndex: rowToDelete - 1,
                                        endIndex: rowToDelete
                                    }
                                }
                            }
                        ]
                    }
                };

                await gapi.client.sheets.spreadsheets.batchUpdate(request);

                console.log('✅ Row deleted successfully from Google Sheets');
                this.showMessage('Data berhasil dihapus!', 'success');
                this.refreshData();

            } catch (error) {
                console.error('❌ Delete row error:', error);
                this.showError('Gagal menghapus data: ' + error.message);
            }
        }
    }

    showMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `alert alert-${type}`;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 4px;
            color: white;
            z-index: 1001;
            max-width: 300px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            animation: slideIn 0.3s ease;
        `;
        
        if (type === 'success') {
            messageDiv.style.backgroundColor = '#28a745';
        } else if (type === 'error') {
            messageDiv.style.backgroundColor = '#dc3545';
        } else {
            messageDiv.style.backgroundColor = '#17a2b8';
        }
        
        messageDiv.innerHTML = `
            ${message}
            <button onclick="this.parentElement.remove()" style="margin-left: 10px; background: none; border: none; color: white; font-size: 18px; cursor: pointer;">&times;</button>
        `;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            if (messageDiv.parentElement) {
                messageDiv.remove();
            }
        }, 3000);
    }

    updateSelectedCount() {
        const checkboxes = document.querySelectorAll('.row-checkbox:checked');
        const countElement = document.getElementById('selectedCount');
        if (countElement) {
            countElement.textContent = `${checkboxes.length} rows selected`;
        }
    }
}

// Global instance
let googleSheetsIntegration;

// Initialize saat DOM ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM loaded, initializing Google Sheets Integration...');
    googleSheetsIntegration = new GoogleSheetsIntegration();
    
    // Dispatch custom event to notify other scripts
    const event = new CustomEvent('googleSheetsIntegrationReady');
    document.dispatchEvent(event);
});

// Global functions untuk onclick handlers
window.refreshGoogleSheetsData = () => {
    if (googleSheetsIntegration) {
        googleSheetsIntegration.refreshData();
    }
};

// Test connection function untuk debugging
window.testGoogleSheetsConnection = async function() {
    console.log('🧪 Testing Google Sheets connection...');
    try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/15Yu8_PcUFvrQFIL3qy7TfvDJNg4XPSbqPJOU6Wh8Q1A/values/REKAP%20CALON%20PELANGGAN%20BY%20SPARTA!A1:I10?key=AIzaSyDiLgnSz4yrRr1AW-dHgvEDSyZS6aGFiZY`;
        const response = await fetch(url);
        const data = await response.json();
        console.log('✅ Connection test result:', data);
        
        if (data.error) {
            console.error('❌ API Error:', data.error);
        }
        
        return data;
    } catch (error) {
        console.error('❌ Connection test failed:', error);
        return null;
    }
};
