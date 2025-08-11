// Google Sheets Integration Script - Enhanced Version with White Screen Prevention

// Global variables for Google API client
let gapiInited = false;
let gisLoadedFlag = false;
let currentIdToken = null;
let initializationAttempts = 0;
const MAX_INITIALIZATION_ATTEMPTS = 3;

// Enhanced error handling and logging
const ErrorHandler = {
  log: (message, level = 'info') => {
    const timestamp = new Date().toISOString();
    console[level](`[${timestamp}] ${message}`);
  },
  
  handleError: (error, context) => {
    ErrorHandler.log(`Error in ${context}: ${error.message}`, 'error');
    ErrorHandler.showUserError(`Terjadi kesalahan: ${error.message}`);
  },
  
  showUserError: (message) => {
    const errorDisplay = document.getElementById('errorDisplay');
    if (errorDisplay) {
      errorDisplay.innerHTML = `
        <div class="alert alert-danger" style="margin: 20px; padding: 15px; border-radius: 5px; background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;">
          <i class="fas fa-exclamation-triangle"></i> ${message}
          <button onclick="this.parentElement.parentElement.style.display='none'" 
                  style="float: right; background: none; border: none; font-size: 20px; cursor: pointer;">
            &times;
          </button>
        </div>
      `;
      errorDisplay.style.display = 'block';
    }
  }
};

// Enhanced initialization with retry mechanism
window.gapiLoaded = function() {
  console.log('gapiLoaded called');
  ErrorHandler.log('gapiLoaded: Google API client library loaded.');
  gapi.load('client', initializeGapiClient);
};

async function initializeGapiClient() {
  console.log('initializeGapiClient called');
  try {
    ErrorHandler.log('initializeGapiClient: Initializing gapi.client...');
    
    if (!CONFIG || !CONFIG.API_KEY || !CONFIG.SCOPES) {
      throw new Error('Configuration missing. Please check config.js');
    }
    
    await gapi.client.init({
      apiKey: CONFIG.API_KEY,
      discoveryDocs: ["https://sheets.googleapis.com/$discovery/rest?version=v4"],
      scope: CONFIG.SCOPES,
    });
    
    gapiInited = true;
    ErrorHandler.log('GAPI client initialized successfully');
    maybeRenderSignInButton();
    
  } catch (error) {
    ErrorHandler.handleError(error, 'initializeGapiClient');
    initializationAttempts++;
    
    if (initializationAttempts < MAX_INITIALIZATION_ATTEMPTS) {
      ErrorHandler.log(`Retrying initialization... (${initializationAttempts}/${MAX_INITIALIZATION_ATTEMPTS})`);
      setTimeout(initializeGapiClient, 2000 * initializationAttempts);
    }
  }
}

window.gisLoaded = function() {
  console.log('gisLoaded called');
  try {
    ErrorHandler.log('gisLoaded: Google Identity Services loaded.');
    
    if (!CONFIG || !CONFIG.CLIENT_ID) {
      throw new Error('CLIENT_ID missing in configuration');
    }
    
    google.accounts.id.initialize({
      client_id: CONFIG.CLIENT_ID,
      callback: window.handleCredentialResponse,
    });
    
    gisLoadedFlag = true;
    ErrorHandler.log('GIS initialized successfully');
    maybeRenderSignInButton();
    
  } catch (error) {
    ErrorHandler.handleError(error, 'gisLoaded');
  }
};

window.handleCredentialResponse = function(response) {
  console.log('handleCredentialResponse called');
  try {
    ErrorHandler.log("Credential response received");
    
    if (response.credential) {
      currentIdToken = response.credential;
      updateSigninStatus(true);
      ErrorHandler.log("Login successful");
    } else {
      throw new Error("No credential in response");
    }
  } catch (error) {
    ErrorHandler.handleError(error, 'handleCredentialResponse');
    updateSigninStatus(false);
  }
};

function maybeRenderSignInButton() {
  console.log('maybeRenderSignInButton called');
  try {
    if (gapiInited && gisLoadedFlag) {
      console.log('gapiInited and gisLoadedFlag are true, rendering button');
      const signInButtonContainer = document.getElementById('g_id_onload');
      if (signInButtonContainer) {
        console.log('signInButtonContainer found');
        google.accounts.id.renderButton(
          signInButtonContainer,
          { 
            theme: "outline", 
            size: "large", 
            text: "signin_with", 
            shape: "rectangular", 
            width: "250" 
          }
        );
        updateSigninStatus(false);
      } else {
        console.log('signInButtonContainer not found');
      }
    } else {
        console.log('gapiInited or gisLoadedFlag is false');
    }
  } catch (error) {
    ErrorHandler.handleError(error, 'maybeRenderSignInButton');
  }
}

function handleSignoutClick() {
  try {
    console.log('handleSignoutClick called');
    if (typeof google !== 'undefined' && typeof google.accounts !== 'undefined' && typeof google.accounts.id !== 'undefined') {
      console.log('google.accounts.id is defined. Attempting disableAutoSelect.');
      google.accounts.id.disableAutoSelect();
    } else {
      console.log('google.accounts.id is NOT defined. Skipping disableAutoSelect.');
    }
    currentIdToken = null;
    updateSigninStatus(false);
    sessionStorage.removeItem('isLoggedIn');
    localStorage.removeItem('isLoggedIn'); // Add this line
    ErrorHandler.log("User signed out");
  } catch (error) {
    ErrorHandler.handleError(error, 'handleSignoutClick');
  }
}

function updateSigninStatus(isSignedIn) {
  try {
    ErrorHandler.log(`Updating sign-in status: ${isSignedIn}`);
    
    const loginContainer = document.getElementById('sign-in-container');
    const mainContent = document.getElementById('main-content');
    const signOutButton = document.getElementById('sign-out-button');

    if (!loginContainer || !mainContent || !signOutButton) {
      ErrorHandler.log('Required DOM elements not found');
      return;
    }

    if (isSignedIn) {
      loginContainer.style.display = 'none';
      mainContent.style.display = 'block';
      signOutButton.style.display = 'block';

      // Set the gapi client token after successful sign-in
      if (currentIdToken) {
        gapi.client.setToken({
          access_token: currentIdToken
        });
        ErrorHandler.log('GAPI client token set.');
      }
      
      // Ensure dashboard is properly initialized
      if (googleSheetsIntegration) {
        googleSheetsIntegration.init().catch(error => {
          ErrorHandler.handleError(error, 'googleSheetsIntegration.init');
        });
      }
      
      sessionStorage.setItem('isLoggedIn', 'true');
    } else { // Added else block for sign-out state
      loginContainer.style.display = 'block';
      mainContent.style.display = 'none';
      signOutButton.style.display = 'none';
      // Clear the gapi client token on sign-out
      gapi.client.setToken('');
      ErrorHandler.log('GAPI client token cleared.');
    }
  } catch (error) {
    ErrorHandler.handleError(error, 'updateSigninStatus');
  }
}


// Safe wrapper for googleSheetsIntegration.refreshData
function safeRefreshData() {
  if (typeof googleSheetsIntegration !== 'undefined' && googleSheetsIntegration.refreshData) {
    googleSheetsIntegration.refreshData();
  } else {
    console.warn('googleSheetsIntegration not ready, retrying...');
    setTimeout(safeRefreshData, 500);
  }
}

// Global functions with error handling

function closeEditModal() {
  try {
    const editModal = document.getElementById('editModal');
    if (editModal) {
      editModal.style.display = 'none';
      editModal.classList.remove('show');
      
      // Reset form when closing
      const editForm = document.getElementById('editForm');
      if (editForm) {
        editForm.reset();
      }
      
      // Clear any error messages
      const errorDisplay = document.getElementById('errorDisplay');
      if (errorDisplay) {
        errorDisplay.style.display = 'none';
      }
    }
  } catch (error) {
    ErrorHandler.handleError(error, 'closeEditModal');
  }
}

// Enhanced DOMContentLoaded with white screen prevention
document.addEventListener('DOMContentLoaded', () => {
  try {
    ErrorHandler.log('DOM Content Loaded - Initializing application...');
    
    // Prevent white screen by ensuring elements exist
    const requiredElements = ['sign-in-container', 'main-content', 'errorDisplay'];
    const missingElements = requiredElements.filter(id => !document.getElementById(id));
    
    if (missingElements.length > 0) {
      ErrorHandler.log(`Missing elements: ${missingElements.join(', ')}`);
      return;
    }
    
    // Check login status
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
    ErrorHandler.log(`Login status: ${isLoggedIn}`);
    
    if (isLoggedIn) {
      updateSigninStatus(true);
    }
    
    // Initialize UI components
    initializeUIComponents();
    
  } catch (error) {
    ErrorHandler.handleError(error, 'DOMContentLoaded');
  }
});

function initializeUIComponents() {
  try {
    // Modal and button event listeners
    const addSalesModal = document.getElementById('addSalesModal');
    const openAddSalesBtn = document.getElementById('openAddSalesBtn');
    const closeAddSalesModal = document.getElementById('closeAddSalesModal');
    const cancelAddSalesBtn = document.getElementById('cancelAddSalesBtn');
    const editModal = document.getElementById('editModal');
    const toggleCustomerFormBtn = document.getElementById('toggle-customer-form');
    const addCustomerFormContainer = document.getElementById('add-customer-form-container');
    const overviewBtn = document.getElementById('overview-btn');

    // Toggle Add Customer Form
    if (toggleCustomerFormBtn) {
      toggleCustomerFormBtn.addEventListener('click', () => {
        const addCustomerSection = document.getElementById('add-customer-section');
        if (addCustomerSection) {
          const isVisible = addCustomerSection.style.display === 'block';
          addCustomerSection.style.display = isVisible ? 'none' : 'block';
          
          // Reset form when opening
          if (!isVisible) {
            resetAddCustomerForm();
            populateSalesDropdown();
          }
          
          // Scroll to form
          if (!isVisible) {
            addCustomerSection.scrollIntoView({ behavior: 'smooth' });
          }
        }
      });
    }
    
    // Close form button
    const closeFormBtn = document.getElementById('closeFormBtn');
    if (closeFormBtn) {
      closeFormBtn.addEventListener('click', () => {
        const addCustomerSection = document.getElementById('add-customer-section');
        if (addCustomerSection) {
          addCustomerSection.style.display = 'none';
          resetAddCustomerForm();
        }
      });
    }
    
    // Cancel button
    const cancelAddCustomerBtn = document.getElementById('cancelAddCustomer');
    if (cancelAddCustomerBtn) {
      cancelAddCustomerBtn.addEventListener('click', () => {
        const addCustomerSection = document.getElementById('add-customer-section');
        if (addCustomerSection) {
          addCustomerSection.style.display = 'none';
          resetAddCustomerForm();
        }
      });
    }
    
    // Initialize Add Customer Form
    initializeAddCustomerForm();

    // Populate sales dropdown
    populateSalesDropdown();

    // Open modal
    if (openAddSalesBtn && addSalesModal) {
      openAddSalesBtn.addEventListener('click', () => {
        addSalesModal.classList.add('show');
      });
    }

    // Close modal
    if(closeAddSalesModal && addSalesModal) {
      closeAddSalesModal.addEventListener('click', () => {
        addSalesModal.classList.remove('show');
      });
    }

    if (cancelAddSalesBtn && addSalesModal) {
      cancelAddSalesBtn.addEventListener('click', () => {
        addSalesModal.classList.remove('show');
      });
    }

    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
      if (event.target === addSalesModal) addSalesModal.classList.remove('show');
      if (event.target === editModal) editModal.classList.remove('show');
    });

    // Close modal with ESC key
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        const editModal = document.getElementById('editModal');
        const addSalesModal = document.getElementById('addSalesModal');
        
        if (editModal && editModal.classList.contains('show')) {
          closeEditModal();
        }
        
        if (addSalesModal && addSalesModal.classList.contains('show')) {
          addSalesModal.classList.remove('show');
        }
      }
    });

    // Show all data when overview is clicked
    if (overviewBtn) {
      overviewBtn.addEventListener('click', () => {
        googleSheetsIntegration.filterBySales('All');
        document.querySelectorAll('.sales-item').forEach(i => i.classList.remove('active'));
        overviewBtn.classList.add('active');
      });
    }

    // Handle form submissions
    setupFormHandlers();
    
  } catch (error) {
    ErrorHandler.handleError(error, 'initializeUIComponents');
  }
}

function setupFormHandlers() {
  try {
    // Handle form tambah sales
    const addSalesForm = document.getElementById('addSalesForm');
    if (addSalesForm) {
      addSalesForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const salesName = document.getElementById('salesName').value.trim();
        if (salesName) {
          alert('Fitur tambah sales akan segera tersedia');
          document.getElementById('addSalesModal').classList.remove('show');
          addSalesForm.reset();
        }
      });
    }

    // Handle edit form submission
    const editForm = document.getElementById('editForm');
    if (editForm) {
      editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const index = document.getElementById('editRowIndex').value;
            const rowToUpdate = parseInt(index) + 2;

            const values = [
                [
                    document.getElementById('editOdp').value,
                    document.getElementById('editNama').value,
                    document.getElementById('editAlamat').value,
                    document.getElementById('editTelepon').value,
                    document.getElementById('editSales').value,
                    document.getElementById('editVisit').value,
                    document.getElementById('editKeterangan').value,
                    document.getElementById('editStatus').value
                ]
            ];

            const sheetName = CONFIG.DATA_RANGE.split('!')[0].replace(/'/g, "");

            const request = {
                spreadsheetId: CONFIG.SPREADSHEET_ID,
                range: `${sheetName}!A${rowToUpdate}:H${rowToUpdate}`,
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: values
                }
            };

            await gapi.client.sheets.spreadsheets.values.update(request);

            console.log('✅ Row updated successfully in Google Sheets');
            closeEditModal();
            safeRefreshData();

        } catch (error) {
            console.error('❌ Update row error:', error);
            ErrorHandler.handleError(error, 'editForm.submit');
        }
      });
    }
  } catch (error) {
    ErrorHandler.handleError(error, 'setupFormHandlers');
  }
}

// Global error handler for uncaught errors
window.addEventListener('error', (event) => {
  // Check if this is the specific refreshData error
  if (event.message.includes('refreshData') && event.message.includes('undefined')) {
    console.warn('Caught refreshData undefined error - this is expected during initialization');
    return; // Don't show this specific error to user
  }
  ErrorHandler.handleError(new Error(event.message), 'Global Error');
});

/**
 * Menghapus baris data dari Google Spreadsheet.
 * @param {number} rowIndex Indeks baris data yang akan dihapus (0-indexed dari data yang ditampilkan, setelah header).
 */
async function deleteCustomerRow(rowIndex) {
    try {
        ErrorHandler.log(`Attempting to delete row at index: ${rowIndex}`);

        // Google Sheets API menggunakan indeks baris 1-based.
        // Jika data Anda dimulai dari baris ke-2 di spreadsheet (setelah header),
        // maka rowIndex 0 di data Anda adalah baris ke-2 di spreadsheet.
        // Jadi, baris yang akan dihapus adalah rowIndex + 2.
        const sheetRowIndex = rowIndex + 2; // +1 for 1-based index, +1 for header row

        const request = {
            spreadsheetId: CONFIG.SPREADSHEET_ID,
            resource: {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: 0, // Biasanya 0 untuk sheet pertama. Anda bisa mendapatkan sheetId dari metadata spreadsheet jika ada banyak sheet.
                            dimension: 'ROWS',
                            startIndex: sheetRowIndex -1, // Start index is 0-based for API, so sheetRowIndex - 1
                            endIndex: sheetRowIndex // End index is exclusive, so sheetRowIndex to delete one row
                        }
                    }
                }]
            }
        };

        await gapi.client.sheets.spreadsheets.batchUpdate(request);

        ErrorHandler.log(`Row ${sheetRowIndex} deleted successfully from Google Sheets.`);
        ErrorHandler.showUserError('Data pelanggan berhasil dihapus!');

        // Refresh data di tabel setelah penghapusan
        safeRefreshData();

    } catch (error) {
        ErrorHandler.handleError(error, `deleteCustomerRow for index ${rowIndex}`);
        ErrorHandler.showUserError(`Gagal menghapus data: ${error.message}`);
    }
}


window.addEventListener('unhandledrejection', (event) => {
  ErrorHandler.handleError(new Error(event.reason), 'Unhandled Promise Rejection');
});

// Listen for googleSheetsIntegration ready event
document.addEventListener('googleSheetsIntegrationReady', () => {
  console.log('googleSheetsIntegration is now ready');
  safeRefreshData();
});

// Initialize googleSheetsIntegration safely
function initializeGoogleSheetsIntegration() {
  if (typeof googleSheetsIntegration === 'undefined') {
    console.log('Waiting for googleSheetsIntegration to load...');
    setTimeout(initializeGoogleSheetsIntegration, 1000);
  } else {
    console.log('googleSheetsIntegration loaded successfully');
    // Ensure it's properly initialized
    if (googleSheetsIntegration.isInitialized) {
      safeRefreshData();
    }
  }
}

// Start initialization when DOM is ready
document.addEventListener('DOMContentLoaded', initializeGoogleSheetsIntegration);

// Add Customer Form Functions
function initializeAddCustomerForm() {
  try {
    const addCustomerForm = document.getElementById('addCustomerForm');
    const cancelAddCustomerBtn = document.getElementById('cancelAddCustomer');
    
    if (addCustomerForm) {
      addCustomerForm.addEventListener('submit', handleAddCustomerSubmit);
    }
    
    if (cancelAddCustomerBtn) {
      cancelAddCustomerBtn.addEventListener('click', () => {
        const addCustomerFormContainer = document.getElementById('add-customer-form-container');
        if (addCustomerFormContainer) {
          addCustomerFormContainer.style.display = 'none';
        }
        resetAddCustomerForm();
      });
    }
    
    
    
  } catch (error) {
    ErrorHandler.handleError(error, 'initializeAddCustomerForm');
  }
}



function populateSalesDropdown() {
  try {
    const salesSelect = document.getElementById('assignedSales');
    const editSalesSelect = document.getElementById('editSales');
    
    // Only proceed if they are select elements
    if (!salesSelect || salesSelect.tagName !== 'SELECT' || 
        !editSalesSelect || editSalesSelect.tagName !== 'SELECT') {
      return; 
    }
    
    // Clear existing options
    salesSelect.innerHTML = '<option value="">Pilih Sales</option>';
    editSalesSelect.innerHTML = '<option value="">Pilih Sales</option>';
    
    // Get sales from the sidebar
    const salesItems = document.querySelectorAll('.sales-item');
    salesItems.forEach(item => {
      const salesName = item.textContent.trim();
      if (salesName && salesName !== 'All') {
        const option1 = new Option(salesName, salesName);
        const option2 = new Option(salesName, salesName);
        salesSelect.add(option1);
        editSalesSelect.add(option2);
      }
    });
    
  } catch (error) {
    ErrorHandler.handleError(error, 'populateSalesDropdown');
  }
}

async function handleAddCustomerSubmit(e) {
  e.preventDefault();

  if (!gapiInited || !gapi.client.sheets) {
    ErrorHandler.showUserError('Google API client not initialized. Please try again.');
    return;
  }
  
  try {
    const formData = new FormData(e.target);
    const customerData = Object.fromEntries(formData.entries());
    
    // Validate required fields
    if (!customerData.nama || !customerData.no_telepon || !customerData.alamat || !customerData.odp_terdekat || !customerData.nama_sales) {
      ErrorHandler.showUserError('Mohon lengkapi semua field yang wajib diisi');
      return;
    }
    
    // Show loading
    const saveBtn = document.getElementById('saveCustomer');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
    saveBtn.disabled = true;
    
    // Prepare data for Google Sheets
    const rowData = [
      [
        customerData.odp_terdekat || '',
        customerData.nama || '',
        customerData.alamat || '',
        customerData.no_telepon || '',
        customerData.nama_sales || '',
        customerData.visit || 'Not Visited',
        customerData.keterangan || '',
        customerData.status || 'Baru',
        customerData.email || '',
        customerData.kelurahan || '',
        customerData.tanggal_visit || '',
        customerData.priority || 'Normal'
      ]
    ];
    
    // Get sheet name from config
    const sheetName = CONFIG.DATA_RANGE.split('!')[0].replace(/'/g, "");
    
    // Get current data to find the next empty row
    const response = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: CONFIG.SPREADSHEET_ID,
      range: CONFIG.DATA_RANGE
    });
    
    const values = response.result.values || [];
    const nextRow = values.length + 2; // +2 because header is row 1
    
    // Append new customer data
    await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: CONFIG.SPREADSHEET_ID,
      range: `${sheetName}!A${nextRow}:L${nextRow}`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: rowData
      }
    });
    
    // Success message
    ErrorHandler.showUserError('Calon pelanggan berhasil ditambahkan!');
    
    // Reset form and hide
    resetAddCustomerForm();
    const addCustomerFormContainer = document.getElementById('add-customer-form-container');
    if (addCustomerFormContainer) {
      addCustomerFormContainer.style.display = 'none';
    }
    
            // Refresh data
            safeRefreshData();
    
  } catch (error) {
    ErrorHandler.handleError(error, 'handleAddCustomerSubmit');
  } finally {
    // Reset button state
    const saveBtn = document.getElementById('saveCustomer');
    saveBtn.innerHTML = '<i class="fas fa-save"></i> Simpan Calon Pelanggan';
    saveBtn.disabled = false;
  }
}

function resetAddCustomerForm() {
  try {
    const form = document.getElementById('addCustomerForm');
    if (form) {
      form.reset();
    }
    
    // Reset any validation states
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      input.classList.remove('error');
    });
    
  } catch (error) {
    ErrorHandler.handleError(error, 'resetAddCustomerForm');
  }
}

// Update the populateSalesDropdown function to be called when sales data is loaded
// Wait for googleSheetsIntegration to be initialized before accessing it
function setupRefreshDataOverride() {
  if (typeof googleSheetsIntegration !== 'undefined' && googleSheetsIntegration.refreshData) {
    const originalRefreshData = googleSheetsIntegration.refreshData;
    googleSheetsIntegration.refreshData = function() {
      originalRefreshData.call(this).then(() => {
        populateSalesDropdown();
      });
    };
  } else {
    // Retry after a short delay
    setTimeout(setupRefreshDataOverride, 100);
  }
}

// Call the setup function when DOM is ready
document.addEventListener('DOMContentLoaded', setupRefreshDataOverride);
