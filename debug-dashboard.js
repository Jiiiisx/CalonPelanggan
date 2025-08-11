// Debug Dashboard - Untuk tracking error whitescreen
(function() {
    'use strict';
    
    // Override console.error untuk capture error
    const originalError = console.error;
    console.error = function(...args) {
        originalError.apply(console, arguments);
        // Simpan error ke localStorage untuk debugging
        const errors = JSON.parse(localStorage.getItem('dashboardErrors') || '[]');
        errors.push({
            timestamp: new Date().toISOString(),
            message: args.join(' '),
            stack: new Error().stack
        });
        localStorage.setItem('dashboardErrors', JSON.stringify(errors));
    };
    
    // Tambahkan error handler global
    window.addEventListener('error', function(e) {
        console.error('Global Error:', e.error);
    });
    
    window.addEventListener('unhandledrejection', function(e) {
        console.error('Unhandled Promise Rejection:', e.reason);
    });
    
    // Fungsi untuk menampilkan error di UI
    window.showDebugInfo = function() {
        const errors = JSON.parse(localStorage.getItem('dashboardErrors') || '[]');
        const debugDiv = document.createElement('div');
        debugDiv.id = 'debug-info';
        debugDiv.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 300px;
            max-height: 400px;
            overflow-y: auto;
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 4px;
            padding: 10px;
            font-family: monospace;
            font-size: 12px;
            z-index: 9999;
        `;
        
        debugDiv.innerHTML = `
            <h4>Debug Info (${errors.length} errors)</h4>
            <button onclick="this.parentElement.remove()">Close</button>
            <button onclick="localStorage.removeItem('dashboardErrors');location.reload()">Clear & Reload</button>
            <pre>${JSON.stringify(errors, null, 2)}</pre>
        `;
        
        document.body.appendChild(debugDiv);
    };
    
    // Auto-show debug info jika ada error
    setTimeout(() => {
        const errors = JSON.parse(localStorage.getItem('dashboardErrors') || '[]');
        if (errors.length > 0) {
            window.showDebugInfo();
        }
    }, 1000);
    
    console.log('Debug dashboard loaded. Press Ctrl+Shift+D to show debug info.');
    
    // Shortcut untuk debug
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.shiftKey && e.key === 'D') {
            window.showDebugInfo();
        }
    });
})();
