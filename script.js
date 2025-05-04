document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const openModalBtn = document.getElementById('open-modal-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const modal = document.getElementById('modal');
    const epinForm = document.getElementById('epin-form');
    const userBusinessNameInput = document.getElementById('user-business-name-input');
    const rawEpinsTextarea = document.getElementById('raw-epins');
    const totalCountEl = document.getElementById('total-count');
    const breakdownEl = document.getElementById('breakdown');
    const copyrightEl = document.getElementById('copyright');
    const appTitleH1 = document.querySelector('.main-container h1');
    const developerNameDisplay = document.querySelector('.developer-name-display');
    const helpIconButton = document.getElementById('help-icon-button');
    const helpModal = document.getElementById('help-modal');
    const closeHelpModalBtn = document.getElementById('close-help-modal-btn');


    // --- State ---
    let parsedEpins = [];

    // --- Constants ---
    const SUPPORTED_NETWORKS = ['MTN', 'AIRTEL', 'GLO', '9MOBILE'];
    const LOGO_PATHS = {
        MTN: 'logos/mtn.png', AIRTEL: 'logos/airtel.png', GLO: 'logos/glo.png', '9MOBILE': 'logos/9mobile.png',
     };
    const LOAD_CODES = {
        GLO: '*203*3*PIN#', DEFAULT: '*311*PIN#',
     };
    const GLO_EXPIRY_DAYS = 6;
    const APP_NAME = "TGR EPIN Formatter";
    const DEVELOPER_NAME = "Dammie Optimus Solution";

    // --- Functions ---

    // Update copyright year and app/developer name displays
    const updateStaticNames = () => {
        const currentYear = new Date().getFullYear();
        copyrightEl.textContent = `© ${currentYear} ${DEVELOPER_NAME}. All rights reserved.`;
        appTitleH1.textContent = APP_NAME;
        if (developerNameDisplay) { developerNameDisplay.textContent = DEVELOPER_NAME; }
    };

    // Show/Hide Main Input Modal
    const showModal = () => modal.classList.remove('hidden');
    const hideModal = () => modal.classList.add('hidden');

    // Show/Hide Help Modal
    const showHelpModal = () => helpModal.classList.remove('hidden');
    const hideHelpModal = () => helpModal.classList.add('hidden');


    // Format PIN with hyphens for display
    const formatPin = (pin) => {
        const cleanedPin = pin.replace(/[^0-9]/g, '');
        let formatted = '';
        for (let i = 0; i < cleanedPin.length; i++) {
            if (i > 0 && i % 4 === 0) formatted += '-';
            formatted += cleanedPin[i];
        }
        return formatted;
     };

    // Get network logo path
    const getLogoPath = (network) => LOGO_PATHS[network.toUpperCase()] || '';

    // Get network-specific load code - USES UNFORMATTED (original) PIN
    const getLoadCode = (network, originalPin) => {
         const upperNetwork = network.toUpperCase();
        const codeTemplate = LOAD_CODES[upperNetwork] || LOAD_CODES.DEFAULT;
        return codeTemplate.replace('PIN', originalPin);
    };

     // Format Date for Expiry
    const formatDate = (date) => {
         return date.toLocaleDateString('en-GB', { weekday: 'short', year: 'numeric', month: 'short', day: '2-digit' }).replace(/,/g, '');
     };

    // Calculate and format expiry date for GLO
    const getExpiryInfo = (network) => {
        if (network.toUpperCase() !== 'GLO') return null;
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + GLO_EXPIRY_DAYS);
        return `USE BEFORE: ${formatDate(expiryDate)}`;
    };

    // Parse entire raw EPIN text block
    const parseRawEpins = (rawText) => {
        const epins = [];
        if (!rawText || rawText.trim().length === 0) return epins;
        const normalizedText = rawText.trim().replace(/\s+/g, ' ');
        const networkAmountRegex = new RegExp(`\\b(${SUPPORTED_NETWORKS.join('|')})\\s+(\\d+)\\b`, 'gi');
        const pinRegex = /\b(\d{12,})\b/g; // Find 12+ digits
        let networkAmountMatches = [];
        let match;
        while ((match = networkAmountRegex.exec(normalizedText)) !== null) {
            networkAmountMatches.push({
                network: match[1].toUpperCase(), amount: parseInt(match[2], 10),
                startIndex: match.index, endIndex: networkAmountRegex.lastIndex
            });
        }
        if (networkAmountMatches.length === 0) {
             console.warn("No Network/Amount pairs found.");
             return epins;
        }
        networkAmountMatches.sort((a, b) => a.startIndex - b.startIndex);
        for (let i = 0; i < networkAmountMatches.length; i++) {
            const currentMatch = networkAmountMatches[i];
            const searchStart = (i === 0) ? 0 : networkAmountMatches[i - 1].endIndex;
            const searchEnd = currentMatch.startIndex;
            const searchSegment = normalizedText.substring(searchStart, searchEnd).trim();
            if (searchSegment.length > 0) {
                let pinMatch;
                pinRegex.lastIndex = 0; // Reset regex index before searching segment
                while ((pinMatch = pinRegex.exec(searchSegment)) !== null) {
                    epins.push({ pin: pinMatch[1], network: currentMatch.network, amount: currentMatch.amount });
                }
            }
        }
        return epins;
     };

    // Update analytics display
    const updateAnalytics = (epins) => {
        parsedEpins = epins;
        totalCountEl.textContent = `Total EPINs Found: ${epins.length}`;
        const breakdown = epins.reduce((acc, epin) => {
            const key = `${epin.network} ₦${epin.amount}`;
            acc[key] = (acc[key] || 0) + 1; return acc;
        }, {});
        breakdownEl.innerHTML = '';
        if (Object.keys(breakdown).length > 0) {
             Object.entries(breakdown).sort().forEach(([key, count]) => {
                const span = document.createElement('span');
                span.textContent = `${key}: ${count}`; breakdownEl.appendChild(span);
            });
        } else { breakdownEl.innerHTML = '<span>No valid EPINs detected yet.</span>'; }
    };

    // Generate print-ready HTML page
    const generatePrintPage = (epinsToPrint, userBusinessName) => {
        if (!epinsToPrint || epinsToPrint.length === 0) {
            alert('No valid EPINs found to print.'); return;
        }
        const printBusinessNameUpper = (userBusinessName || "Your Business").toUpperCase();
        let printHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Print EPINs - ${APP_NAME}</title><link rel="stylesheet" href="style.css"><style>body{margin:0;padding:0;background-color:#fff!important}#print-output{display:block!important}@page{size:A4;margin:5mm}</style></head><body><div id="print-output"><div class="print-page">`;
        epinsToPrint.forEach(epin => {
            const formattedPin = formatPin(epin.pin);
            const logoSrc = getLogoPath(epin.network);
            const loadCode = getLoadCode(epin.network, epin.pin);
            const expiryInfo = getExpiryInfo(epin.network);
            const displayAmount = epin.amount;
            printHtml += `<div class="recharge-card"><div class="card-header"><span class="card-business-name">${printBusinessNameUpper}</span>${logoSrc ? `<img src="${logoSrc}" alt="${epin.network}" class="card-logo">` : ''}</div><div class="card-details"><div class="card-network-amount">${epin.network} ₦${displayAmount}</div><div class="card-pin">${formattedPin}</div></div><div class="card-footer"><div class="card-load-code">HOW TO LOAD: ${loadCode}</div>${expiryInfo ? `<div class="card-expiry">${expiryInfo}</div>` : ''}</div></div>`;
        });
        printHtml += `</div></div><script>window.onload=()=>{window.print()}<\/script></body></html>`;
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.open(); printWindow.document.write(printHtml); printWindow.document.close();
        } else { alert('Could not open print window. Please check your popup blocker settings.'); }
    };


    // --- Event Listeners ---
    // Main Modal
    openModalBtn.addEventListener('click', showModal);
    closeModalBtn.addEventListener('click', hideModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) hideModal(); });

    // Help Modal
    if (helpIconButton) {
        helpIconButton.addEventListener('click', showHelpModal);
        helpIconButton.addEventListener('keydown', (e) => { if (e.key === 'Enter') showHelpModal(); });
    }
    if (closeHelpModalBtn) { closeHelpModalBtn.addEventListener('click', hideHelpModal); }
    if (helpModal) { helpModal.addEventListener('click', (e) => { if (e.target === helpModal) hideHelpModal(); }); }


    // Input & Form Submission
    rawEpinsTextarea.addEventListener('input', () => { updateAnalytics(parseRawEpins(rawEpinsTextarea.value)); });
    epinForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const userBusinessName = userBusinessNameInput.value.trim();
        const rawText = rawEpinsTextarea.value;
        const finalEpins = parseRawEpins(rawText);
        if (!userBusinessName) { alert("Please enter your Business Name."); userBusinessNameInput.focus(); return; }
        if (finalEpins.length === 0) { alert("No valid EPINs parsed. Check format (e.g., PINs... Network Amount)."); rawEpinsTextarea.focus(); return; }
        updateAnalytics(finalEpins);
        generatePrintPage(parsedEpins, userBusinessName);
        // hideModal(); // Optionally close main modal after print
    });

    // --- Initialisation ---
    updateStaticNames();
    updateAnalytics([]);

});