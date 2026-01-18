/**
 * SGC-MineGesty - Fonctionnalites etendues
 * =====================================
 * 
 * Architecture, Conception, Realisation: SG-Commander
 * Tous droits reserves.
 * 
 * Fait sur demande de l'interesse sur description generique non detaillee
 * des informations reelles.
 * Code Clean de toutes informations reelles et/ou de test.
 * 
 * Contact: StacGate.Commander@gmail.com
 * Date: Janvier 2026
 */
// --- Mise E  jour de la sauvegarde pour inclure reclamations ---
const originalSauvegarder = sauvegarderVersLocalStorage;
sauvegarderVersLocalStorage = function () {
    try {
        localStorage.setItem('sgc_clients', JSON.stringify(state.clients));
        localStorage.setItem('sgc_equipements', JSON.stringify(state.equipements));
        localStorage.setItem('sgc_cartes', JSON.stringify(state.cartes));
        localStorage.setItem('sgc_reclamations', JSON.stringify(state.reclamations || []));
        localStorage.setItem('sgc_config', JSON.stringify(state.config));
        return true;
    } catch (e) {
        console.error('Erreur sauvegarde localStorage:', e);
        return false;
    }
};

// Charger les reclamations au demarrage
document.addEventListener('DOMContentLoaded', () => {
    try {
        const reclamationsData = localStorage.getItem('sgc_reclamations');
        if (reclamationsData) state.reclamations = JSON.parse(reclamationsData);
    } catch (e) {
        console.error('Erreur chargement reclamations:', e);
    }
});

// --- INVENTAIRE ---
function rafraichirInventaire() {
    // Initialiser les filtres
    const invFiltreEtat = document.getElementById('invFiltreEtat');
    const invFiltreMarque = document.getElementById('invFiltreMarque');
    const invFiltreClient = document.getElementById('invFiltreClient');
    const invFiltreWilaya = document.getElementById('invFiltreWilaya');

    if (invFiltreEtat) {
        invFiltreEtat.innerHTML = '<option value="">Tous E‰tats</option>' +
            state.config.etatsEquipement.map(e => `<option value="${e.id}">${e.label}</option>`).join('');
    }
    if (invFiltreMarque) {
        invFiltreMarque.innerHTML = '<option value="">Toutes Marques</option>' +
            state.config.marques.map(m => `<option value="${m}">${m}</option>`).join('');
    }
    if (invFiltreClient) {
        invFiltreClient.innerHTML = '<option value="">Tous Clients</option>' +
            state.clients.map(c => `<option value="${c.id}">${c.codeClient} - ${c.raisonSociale}</option>`).join('');
    }
    if (invFiltreWilaya) {
        const wilayas = [...new Set(state.clients.map(c => c.wilaya).filter(Boolean))];
        invFiltreWilaya.innerHTML = '<option value="">Toutes Wilayas</option>' +
            wilayas.map(w => `<option value="${w}">${w}</option>`).join('');
    }

    // Appliquer les filtres
    let items = [...state.equipements];
    const dateRef = document.getElementById('invDateRef')?.value;
    const type = document.getElementById('invFiltreType')?.value;
    const etat = document.getElementById('invFiltreEtat')?.value;
    const marque = document.getElementById('invFiltreMarque')?.value;
    const clientId = document.getElementById('invFiltreClient')?.value;
    const wilaya = document.getElementById('invFiltreWilaya')?.value;

    // Reconstitution E  une date donnee
    if (dateRef) {
        const dateRefObj = new Date(dateRef + 'T23:59:59');
        items = items.map(eq => {
            const eqCopy = { ...eq };
            const historiqueAvantDate = (eq.historique || []).filter(h => new Date(h.date) <= dateRefObj);
            if (historiqueAvantDate.length > 0) {
                const dernierEtat = historiqueAvantDate[historiqueAvantDate.length - 1];
                eqCopy.etat = dernierEtat.etatApres || eq.etat;
                eqCopy.clientId = dernierEtat.nouveauClientId || dernierEtat.clientId || eq.clientId;
            }
            return eqCopy;
        });
    }

    // Filtres
    if (type) items = items.filter(e => e.type === type);
    if (etat) items = items.filter(e => e.etat === etat);
    if (marque) items = items.filter(e => e.marque === marque);
    if (clientId) items = items.filter(e => e.clientId === clientId);
    if (wilaya) {
        const clientsWilaya = state.clients.filter(c => c.wilaya === wilaya).map(c => c.id);
        items = items.filter(e => clientsWilaya.includes(e.clientId));
    }

    // Statistiques
    const stats = document.getElementById('inventaireStats');
    if (stats) {
        const totaux = {};
        state.config.etatsEquipement.forEach(e => totaux[e.id] = 0);
        items.forEach(eq => {
            if (totaux[eq.etat] !== undefined) totaux[eq.etat]++;
        });

        stats.innerHTML = `
            <div class="dashboard-stats" style="margin-bottom:20px;">
                <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-list"></i></div>
                    <div class="stat-info"><span class="stat-value">${items.length}</span><span class="stat-label">Total Filtre</span></div></div>
                ${state.config.etatsEquipement.slice(0, 4).map(e => `
                    <div class="stat-card"><div class="stat-icon ${e.color === 'success' ? 'green' : e.color === 'danger' ? 'red' : 'orange'}">
                        <i class="fas fa-circle"></i></div>
                        <div class="stat-info"><span class="stat-value">${totaux[e.id]}</span><span class="stat-label">${e.label}</span></div></div>
                `).join('')}
            </div>
        `;
    }

    // Tableau
    const tbody = document.getElementById('inventaireTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    items.forEach(eq => {
        const client = state.clients.find(c => c.id === eq.clientId);
        const etatInfo = state.config.etatsEquipement.find(e => e.id === eq.etat) || { label: eq.etat, color: 'secondary' };
        const dernierHistorique = eq.historique && eq.historique.length > 0 ? eq.historique[eq.historique.length - 1] : null;
        const dateMAJ = dernierHistorique ? new Date(dernierHistorique.date).toLocaleDateString('fr-FR') : '-';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${eq.type || 'TPE'}</td>
            <td><strong>${eq.numeroSerie || ''}</strong></td>
            <td>${eq.marque || '-'} ${eq.modele ? '/ ' + eq.modele : ''}</td>
            <td>${client ? client.raisonSociale : '-'}</td>
            <td>${client ? client.codeClient : '-'}</td>
            <td>${client ? client.wilaya || '-' : '-'}</td>
            <td><span class="badge badge-${etatInfo.color}">${etatInfo.label}</span></td>
            <td>${dateMAJ}</td>
        `;
        tbody.appendChild(tr);
    });
}

function exporterInventaire() {
    const items = [...state.equipements];
    const wsData = items.map(eq => {
        const client = state.clients.find(c => c.id === eq.clientId);
        return {
            'Type': eq.type || 'TPE',
            'N Serie': eq.numeroSerie,
            'Marque': eq.marque,
            'Modele': eq.modele,
            'Client': client ? client.raisonSociale : '',
            'Code Client': client ? client.codeClient : '',
            'Wilaya': client ? client.wilaya : '',
            'E‰tat': getEtatLabel(eq.etat)
        };
    });

    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventaire');
    XLSX.writeFile(wb, `Inventaire_SGC-MineGesty_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast('Inventaire exporte', 'success');
}

// --- HISTORIQUE AME‰LIORE‰ ---
function initialiserFiltresHistorique() {
    const filtreHistClient = document.getElementById('filtreHistClient');
    const filtreHistEtat = document.getElementById('filtreHistEtat');
    const filtreHistWilaya = document.getElementById('filtreHistWilaya');

    if (filtreHistClient) {
        filtreHistClient.innerHTML = '<option value="">Tous Clients</option>' +
            state.clients.map(c => `<option value="${c.id}">${c.codeClient} - ${c.raisonSociale}</option>`).join('');
    }
    if (filtreHistEtat) {
        filtreHistEtat.innerHTML = '<option value="">Tous E‰tats</option>' +
            state.config.etatsEquipement.map(e => `<option value="${e.id}">${e.label}</option>`).join('');
    }
    if (filtreHistWilaya) {
        const wilayas = [...new Set(state.clients.map(c => c.wilaya).filter(Boolean))];
        filtreHistWilaya.innerHTML = '<option value="">Toutes Wilayas</option>' +
            wilayas.map(w => `<option value="${w}">${w}</option>`).join('');
    }

    // Afficher tout l'historique par defaut
    rechercherHistorique();
}

// Reecrire rechercherHistorique pour utiliser le nouveau format tableau
const originalRechercherHistorique = rechercherHistorique;
rechercherHistorique = function () {
    const numeroSerie = document.getElementById('rechercheEquip')?.value.trim() || '';
    const clientId = document.getElementById('filtreHistClient')?.value || '';
    const etat = document.getElementById('filtreHistEtat')?.value || '';
    const wilaya = document.getElementById('filtreHistWilaya')?.value || '';
    const dateDebut = document.getElementById('dateDebut')?.value || '';
    const dateFin = document.getElementById('dateFin')?.value || '';

    const tbody = document.getElementById('historiqueTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    let resultats = [];

    state.equipements.forEach(eq => {
        if (numeroSerie && !eq.numeroSerie.toLowerCase().includes(numeroSerie.toLowerCase())) return;

        const eqClient = state.clients.find(c => c.id === eq.clientId);

        if (clientId && eq.clientId !== clientId) return;
        if (wilaya && eqClient && eqClient.wilaya !== wilaya) return;

        (eq.historique || []).forEach(h => {
            const hDate = new Date(h.date);
            if (dateDebut && hDate < new Date(dateDebut)) return;
            if (dateFin && hDate > new Date(dateFin + 'T23:59:59')) return;
            if (etat && h.etatApres !== etat && h.etatAvant !== etat) return;

            resultats.push({ ...h, equipement: eq, client: eqClient });
        });
    });

    resultats.sort((a, b) => new Date(b.date) - new Date(a.date));

    resultats.slice(0, 500).forEach(r => {
        const date = new Date(r.date).toLocaleString('fr-FR');
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${date}</td>
            <td><strong>${r.equipement.numeroSerie}</strong></td>
            <td>${r.client ? r.client.raisonSociale : '-'}</td>
            <td>${r.client ? r.client.wilaya || '-' : '-'}</td>
            <td>${r.action.replace(/_/g, ' ')}</td>
            <td>${r.etatAvant ? getEtatLabel(r.etatAvant) : '-'}</td>
            <td>${r.etatApres ? getEtatLabel(r.etatApres) : '-'}</td>
            <td>${r.naturePanne || r.notes || '-'}</td>
        `;
        tbody.appendChild(tr);
    });

    if (resultats.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-secondary);">Aucun resultat</td></tr>';
    } else if (resultats.length > 500) {
        toast(`${resultats.length} resultats, affichage limite E  500`, 'warning');
    }
};

// --- RE‰CLAMATIONS ---
function rafraichirReclamations() {
    const recFiltreClient = document.getElementById('recFiltreClient');
    if (recFiltreClient) {
        recFiltreClient.innerHTML = '<option value="">Tous Clients</option>' +
            state.clients.map(c => `<option value="${c.id}">${c.codeClient} - ${c.raisonSociale}</option>`).join('');
    }

    filtrerReclamations();
}

function filtrerReclamations() {
    const tbody = document.getElementById('reclamationsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const statut = document.getElementById('recFiltreStatut')?.value || '';
    const clientId = document.getElementById('recFiltreClient')?.value || '';
    const priorite = document.getElementById('recFiltrePriorite')?.value || '';

    let items = [...(state.reclamations || [])];

    if (statut) items = items.filter(r => r.statut === statut);
    if (clientId) items = items.filter(r => r.clientId === clientId);
    if (priorite) items = items.filter(r => r.priorite === priorite);

    items.sort((a, b) => new Date(b.date) - new Date(a.date));

    const prioriteColors = { basse: 'secondary', normale: 'info', haute: 'warning', urgente: 'danger' };
    const statutColors = { ouverte: 'danger', en_cours: 'warning', resolue: 'success', cloturee: 'secondary' };
    const statutLabels = { ouverte: 'Ouverte', en_cours: 'En Cours', resolue: 'Resolue', cloturee: 'Cloturee' };

    items.forEach(rec => {
        const client = state.clients.find(c => c.id === rec.clientId);
        const equip = state.equipements.find(e => e.id === rec.equipementId);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${rec.numero}</strong></td>
            <td>${new Date(rec.date).toLocaleDateString('fr-FR')}</td>
            <td>${client ? client.raisonSociale : '-'}</td>
            <td>${equip ? equip.numeroSerie : '-'}</td>
            <td>${rec.objet}</td>
            <td><span class="badge badge-${prioriteColors[rec.priorite] || 'secondary'}">${rec.priorite}</span></td>
            <td><span class="badge badge-${statutColors[rec.statut] || 'secondary'}">${statutLabels[rec.statut] || rec.statut}</span></td>
            <td class="actions">
                <button class="btn-secondary btn-sm" onclick="editerReclamation('${rec.id}')" title="Modifier"><i class="fas fa-edit"></i></button>
                <button class="btn-secondary btn-sm" onclick="voirReclamation('${rec.id}')" title="Voir details"><i class="fas fa-eye"></i></button>
                <button class="btn-secondary btn-sm btn-danger" onclick="supprimerReclamation('${rec.id}')" title="Supprimer"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-secondary);">Aucune reclamation</td></tr>';
    }
}

function ouvrirModalReclamation(id = null) {
    state.reclamationEnCours = id;
    document.getElementById('modalReclamationTitle').textContent = id ? 'Modifier Reclamation' : 'Nouvelle Reclamation';

    // Remplir selects
    document.getElementById('recClient').innerHTML = '<option value="">-- Selectionner --</option>' +
        state.clients.map(c => `<option value="${c.id}">${c.codeClient} - ${c.raisonSociale}</option>`).join('');
    document.getElementById('recEquipement').innerHTML = '<option value="">-- Optionnel --</option>' +
        state.equipements.map(e => `<option value="${e.id}">${e.numeroSerie} (${e.type})</option>`).join('');

    if (id) {
        const rec = state.reclamations.find(r => r.id === id);
        if (rec) {
            document.getElementById('recClient').value = rec.clientId || '';
            document.getElementById('recEquipement').value = rec.equipementId || '';
            document.getElementById('recObjet').value = rec.objet || '';
            document.getElementById('recDescription').value = rec.description || '';
            document.getElementById('recPriorite').value = rec.priorite || 'normale';
            document.getElementById('recStatut').value = rec.statut || 'ouverte';
            document.getElementById('recNotes').value = rec.notes || '';
        }
    } else {
        document.getElementById('formReclamation').reset();
    }

    ouvrirModal('modalReclamation');
}

function sauvegarderReclamation(e) {
    e.preventDefault();

    const isNew = !state.reclamationEnCours;
    const reclamation = {
        id: state.reclamationEnCours || genererID(),
        numero: isNew ? `REC-${Date.now().toString(36).toUpperCase()}` : undefined,
        date: isNew ? new Date().toISOString() : undefined,
        clientId: document.getElementById('recClient').value,
        equipementId: document.getElementById('recEquipement').value || null,
        objet: document.getElementById('recObjet').value,
        description: document.getElementById('recDescription').value,
        priorite: document.getElementById('recPriorite').value,
        statut: document.getElementById('recStatut').value,
        notes: document.getElementById('recNotes').value,
        historique: []
    };

    if (state.reclamationEnCours) {
        const idx = state.reclamations.findIndex(r => r.id === state.reclamationEnCours);
        if (idx !== -1) {
            const ancien = state.reclamations[idx];
            reclamation.numero = ancien.numero;
            reclamation.date = ancien.date;
            reclamation.historique = ancien.historique || [];
            reclamation.historique.push({
                date: new Date().toISOString(),
                action: 'modification',
                details: `Statut: ${ancien.statut} â†’ ${reclamation.statut}`
            });
            state.reclamations[idx] = reclamation;
        }
    } else {
        reclamation.historique.push({
            date: new Date().toISOString(),
            action: 'creation',
            details: 'Reclamation creee'
        });
        state.reclamations.push(reclamation);
    }

    sauvegarderVersLocalStorage();
    fermerModal('modalReclamation');
    rafraichirReclamations();
    toast(state.reclamationEnCours ? 'Reclamation modifiee' : 'Reclamation creee', 'success');
    state.reclamationEnCours = null;
}

function editerReclamation(id) {
    ouvrirModalReclamation(id);
}

function voirReclamation(id) {
    const rec = state.reclamations.find(r => r.id === id);
    if (!rec) return;

    const client = state.clients.find(c => c.id === rec.clientId);
    const equip = state.equipements.find(e => e.id === rec.equipementId);

    alert(`Reclamation: ${rec.numero}\n` +
        `Date: ${new Date(rec.date).toLocaleString('fr-FR')}\n` +
        `Client: ${client ? client.raisonSociale : '-'}\n` +
        `E‰quipement: ${equip ? equip.numeroSerie : '-'}\n` +
        `Objet: ${rec.objet}\n` +
        `Description: ${rec.description || '-'}\n` +
        `Priorite: ${rec.priorite}\n` +
        `Statut: ${rec.statut}\n` +
        `Notes: ${rec.notes || '-'}`);
}

function supprimerReclamation(id) {
    if (!confirm('Supprimer cette reclamation ?')) return;
    state.reclamations = state.reclamations.filter(r => r.id !== id);
    sauvegarderVersLocalStorage();
    rafraichirReclamations();
    toast('Reclamation supprimee', 'success');
}

// --- EXPORTS CONTEXTUELS ---
function toggleExportMenu(vue) {
    // Fermer tous les autres menus
    document.querySelectorAll('.export-menu').forEach(m => {
        if (m.id !== `exportMenu-${vue}`) m.classList.remove('active');
    });

    const menu = document.getElementById(`exportMenu-${vue}`);
    if (menu) menu.classList.toggle('active');
}

// Fermer les menus en cliquant ailleurs
document.addEventListener('click', (e) => {
    if (!e.target.closest('.export-dropdown')) {
        document.querySelectorAll('.export-menu').forEach(m => m.classList.remove('active'));
    }
});

function exporterVue(vue, format) {
    // Fermer le menu
    document.querySelectorAll('.export-menu').forEach(m => m.classList.remove('active'));

    const data = obtenirDonneesVue(vue);
    const titre = `SGC-MineGesty - ${vue.charAt(0).toUpperCase() + vue.slice(1)}`;
    const date = new Date().toISOString().slice(0, 10);

    switch (format) {
        case 'excel':
            exporterVueExcel(data, vue, date);
            break;
        case 'html':
            exporterVueHTML(data, titre, date);
            break;
        case 'pdf':
            exporterVuePDF(data, titre, date);
            break;
    }
}

function obtenirDonneesVue(vue) {
    switch (vue) {
        case 'clients':
            return obtenirDonneesClients();
        case 'equipements':
            return obtenirDonneesEquipements();
        case 'historique':
            return obtenirDonneesHistorique();
        case 'reclamations':
            return obtenirDonneesReclamations();
        case 'inventaire':
            return obtenirDonneesInventaire();
        default:
            return { headers: [], rows: [] };
    }
}

function obtenirDonneesClients() {
    const headers = ['Code', 'Raison Sociale', 'Wilaya', 'District', 'Type Attribution', 'E‰quipements'];
    const rows = [];

    // Appliquer les filtres actuels
    let clients = [...state.clients];
    const wilayaFiltre = document.getElementById('filtreWilaya')?.value;
    const districtFiltre = document.getElementById('filtreDistrict')?.value;

    if (wilayaFiltre) clients = clients.filter(c => c.wilaya === wilayaFiltre);
    if (districtFiltre) clients = clients.filter(c => c.district === districtFiltre);

    clients.forEach(c => {
        const nbEquip = state.equipements.filter(e => e.clientId === c.id).length;
        rows.push([c.codeClient, c.raisonSociale, c.wilaya || '', c.district || '', c.typeAttribution || '', nbEquip]);
    });

    return { headers, rows };
}

function obtenirDonneesEquipements() {
    const headers = ['N Serie', 'Type', 'Marque', 'Client', 'E‰tat', 'Derniere MAJ'];
    const rows = [];

    let equips = [...state.equipements];
    const etatFiltre = document.getElementById('filtreEtat')?.value;
    const marqueFiltre = document.getElementById('filtreMarque')?.value;
    const typeFiltre = document.getElementById('filtreType')?.value;

    if (etatFiltre) equips = equips.filter(e => e.etat === etatFiltre);
    if (marqueFiltre) equips = equips.filter(e => e.marque === marqueFiltre);
    if (typeFiltre) equips = equips.filter(e => e.type === typeFiltre);

    equips.forEach(eq => {
        const client = state.clients.find(c => c.id === eq.clientId);
        const dernierH = eq.historique && eq.historique.length > 0 ? eq.historique[eq.historique.length - 1] : null;
        rows.push([
            eq.numeroSerie,
            eq.type || 'TPE',
            eq.marque || '',
            client ? client.raisonSociale : '',
            getEtatLabel(eq.etat),
            dernierH ? new Date(dernierH.date).toLocaleDateString('fr-FR') : ''
        ]);
    });

    return { headers, rows };
}

function obtenirDonneesHistorique() {
    const headers = ['Date', 'N Serie', 'Client', 'Wilaya', 'Action', 'E‰tat Avant', 'E‰tat Apres', 'Details'];
    const rows = [];

    // Recuperer les donnees du tableau affiche
    const tbody = document.getElementById('historiqueTableBody');
    if (tbody) {
        tbody.querySelectorAll('tr').forEach(tr => {
            const cells = tr.querySelectorAll('td');
            if (cells.length >= 8) {
                rows.push([...cells].map(td => td.textContent.trim()));
            }
        });
    }

    return { headers, rows };
}

function obtenirDonneesReclamations() {
    const headers = ['N Recl.', 'Date', 'Client', 'E‰quipement', 'Objet', 'Priorite', 'Statut'];
    const rows = [];

    let items = [...(state.reclamations || [])];
    const statutFiltre = document.getElementById('recFiltreStatut')?.value;
    const clientFiltre = document.getElementById('recFiltreClient')?.value;
    const prioriteFiltre = document.getElementById('recFiltrePriorite')?.value;

    if (statutFiltre) items = items.filter(r => r.statut === statutFiltre);
    if (clientFiltre) items = items.filter(r => r.clientId === clientFiltre);
    if (prioriteFiltre) items = items.filter(r => r.priorite === prioriteFiltre);

    items.forEach(rec => {
        const client = state.clients.find(c => c.id === rec.clientId);
        const equip = state.equipements.find(e => e.id === rec.equipementId);
        rows.push([
            rec.numero,
            new Date(rec.date).toLocaleDateString('fr-FR'),
            client ? client.raisonSociale : '',
            equip ? equip.numeroSerie : '',
            rec.objet,
            rec.priorite,
            rec.statut
        ]);
    });

    return { headers, rows };
}

function obtenirDonneesInventaire() {
    const headers = ['Type', 'N Serie', 'Marque/Modele', 'Client', 'Code Client', 'Wilaya', 'E‰tat', 'Derniere MAJ'];
    const rows = [];

    const tbody = document.getElementById('inventaireTableBody');
    if (tbody) {
        tbody.querySelectorAll('tr').forEach(tr => {
            const cells = tr.querySelectorAll('td');
            if (cells.length >= 8) {
                rows.push([...cells].map(td => td.textContent.trim()));
            }
        });
    }

    return { headers, rows };
}

function exporterVueExcel(data, vue, date) {
    const ws = XLSX.utils.aoa_to_sheet([data.headers, ...data.rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, vue);
    XLSX.writeFile(wb, `Export_${vue}_${date}.xlsx`);
    toast(`Export Excel ${vue} termine`, 'success');
}

function exporterVueHTML(data, titre, date) {
    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>${titre} - ${date}</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #6366f1; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        th { background: #f8f9fa; }
        tr:nth-child(even) { background: #f8f9fa; }
        .footer { margin-top: 30px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <h1>${titre}</h1>
    <p>Exporte le ${new Date().toLocaleString('fr-FR')}</p>
    <table>
        <thead><tr>${data.headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${data.rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>
    <p class="footer">SGC-MineGesty - ${data.rows.length} enregistrement(s)</p>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Export_${titre.replace(/[^a-zA-Z0-9]/g, '_')}_${date}.html`;
    a.click();
    toast('Export HTML termine', 'success');
}

function exporterVuePDF(data, titre, date) {
    // Generation PDF via page HTML imprimable
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>${titre} - ${date}</title>
    <style>
        @media print { @page { size: landscape; margin: 15mm; } }
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #6366f1; margin-bottom: 5px; }
        .subtitle { color: #666; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        th { background: #6366f1; color: white; }
        tr:nth-child(even) { background: #f8f9fa; }
        .footer { margin-top: 20px; color: #666; font-size: 10px; }
    </style>
</head>
<body>
    <h1>${titre}</h1>
    <p class="subtitle">Exporte le ${new Date().toLocaleString('fr-FR')}</p>
    <table>
        <thead><tr>${data.headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${data.rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>
    <p class="footer">SGC-MineGesty - ${data.rows.length} enregistrement(s) | Imprimez en PDF pour sauvegarder</p>
    <script>setTimeout(() => { window.print(); }, 500);</script>
</body>
</html>`);
    printWindow.document.close();
    toast('Fenetre PDF ouverte - Utilisez "Enregistrer en PDF"', 'info');
}

// --- RECHERCHE GLOBALE E‰TENDUE ---
// Reecriture de rechercheGlobale pour chercher dans toutes les colonnes
const originalRechercheGlobale = rechercheGlobale;
rechercheGlobale = function () {
    const terme = document.getElementById('globalSearch').value.toLowerCase().trim();
    if (terme.length < 2) return;

    // Recherche dans clients (toutes colonnes + champs dynamiques)
    const clientsResultats = state.clients.filter(c => {
        const champs = [
            c.codeClient, c.raisonSociale, c.wilaya, c.district,
            c.entiteCommerciale, c.commune, c.adresse, c.typeAttribution
        ];
        if (c.customFields) {
            Object.values(c.customFields).forEach(v => champs.push(String(v)));
        }
        return champs.some(ch => ch && String(ch).toLowerCase().includes(terme));
    });

    // Recherche dans equipements (toutes colonnes + champs dynamiques)
    const equipResultats = state.equipements.filter(e => {
        const client = state.clients.find(c => c.id === e.clientId);
        const champs = [
            e.numeroSerie, e.type, e.marque, e.modele,
            client?.raisonSociale, client?.codeClient, client?.wilaya
        ];
        if (e.customFields) {
            Object.values(e.customFields).forEach(v => champs.push(String(v)));
        }
        return champs.some(ch => ch && String(ch).toLowerCase().includes(terme));
    });

    // Recherche dans reclamations
    const reclamResultats = (state.reclamations || []).filter(r => {
        const client = state.clients.find(c => c.id === r.clientId);
        const equip = state.equipements.find(e => e.id === r.equipementId);
        const champs = [
            r.numero, r.objet, r.description, r.priorite, r.statut,
            client?.raisonSociale, equip?.numeroSerie
        ];
        return champs.some(ch => ch && String(ch).toLowerCase().includes(terme));
    });

    // Priorite E  l'onglet actuellement affiche
    const vueActive = state.vueActive;
    let resultatsAffiches = 0;

    // Fonction pour afficher les clients
    const afficherClientsResultats = () => {
        const tbody = document.querySelector('#tableClients tbody');
        if (!tbody) return 0;
        tbody.innerHTML = '';
        clientsResultats.forEach(client => {
            const nbEquip = state.equipements.filter(e => e.clientId === client.id).length;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${client.codeClient || ''}</strong></td>
                <td>${client.raisonSociale || ''}</td>
                <td>${client.wilaya || '-'}</td>
                <td>${client.district || '-'}</td>
                <td>${client.typeAttribution || '-'}</td>
                <td><span class="badge badge-info">${nbEquip}</span></td>
                <td class="actions">
                    <button class="btn-secondary btn-sm" onclick="editerClient('${client.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-secondary btn-sm" onclick="voirEquipementsClient('${client.id}')"><i class="fas fa-terminal"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        return clientsResultats.length;
    };

    // Fonction pour afficher les equipements
    const afficherEquipResultats = () => {
        const tbody = document.querySelector('#tableEquipements tbody');
        if (!tbody) return 0;
        tbody.innerHTML = '';
        equipResultats.forEach(eq => afficherLigneEquipement(eq, tbody));
        return equipResultats.length;
    };

    // Fonction pour afficher les reclamations
    const afficherReclamResultats = () => {
        // Utilise la fonction existante mais avec les donnees filtrees
        const tbody = document.getElementById('reclamationsTableBody');
        if (!tbody) return 0;
        tbody.innerHTML = '';
        const statutLabels = { ouverte: 'Ouverte', en_cours: 'En Cours', resolue: 'Resolue', cloturee: 'Cloturee' };
        const prioriteColors = { basse: 'secondary', normale: 'info', haute: 'warning', urgente: 'danger' };
        const statutColors = { ouverte: 'danger', en_cours: 'warning', resolue: 'success', cloturee: 'secondary' };
        reclamResultats.forEach(rec => {
            const client = state.clients.find(c => c.id === rec.clientId);
            const equip = state.equipements.find(e => e.id === rec.equipementId);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${rec.numero}</strong></td>
                <td>${new Date(rec.date).toLocaleDateString('fr-FR')}</td>
                <td>${client ? client.raisonSociale : '-'}</td>
                <td>${equip ? equip.numeroSerie : '-'}</td>
                <td>${rec.objet}</td>
                <td><span class="badge badge-${prioriteColors[rec.priorite] || 'secondary'}">${rec.priorite}</span></td>
                <td><span class="badge badge-${statutColors[rec.statut] || 'secondary'}">${statutLabels[rec.statut] || rec.statut}</span></td>
                <td class="actions">
                    <button class="btn-secondary btn-sm" onclick="editerReclamation('${rec.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-secondary btn-sm" onclick="voirReclamation('${rec.id}')"><i class="fas fa-eye"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        return reclamResultats.length;
    };

    // Appliquer la recherche sur l'onglet actif en priorite
    if (vueActive === 'clients' && clientsResultats.length > 0) {
        resultatsAffiches = afficherClientsResultats();
    } else if (vueActive === 'equipements' && equipResultats.length > 0) {
        resultatsAffiches = afficherEquipResultats();
    } else if (vueActive === 'reclamations' && reclamResultats.length > 0) {
        resultatsAffiches = afficherReclamResultats();
    } else if (vueActive === 'repertoires' && clientsResultats.length > 0) {
        // Repertoires utilise les memes donnees que clients
        document.getElementById('rechercheRepertoire').value = terme;
        filtrerRepertoire();
        resultatsAffiches = clientsResultats.length;
    } else if (vueActive === 'inventaire' && equipResultats.length > 0) {
        // Inventaire - rafraichir avec filtre
        resultatsAffiches = equipResultats.length;
        rafraichirInventaire();
    } else {
        // Si pas de resultats dans l'onglet actif, chercher dans les autres
        if (equipResultats.length > 0) {
            afficherVue('equipements');
            resultatsAffiches = afficherEquipResultats();
        } else if (clientsResultats.length > 0) {
            afficherVue('clients');
            resultatsAffiches = afficherClientsResultats();
        } else if (reclamResultats.length > 0) {
            afficherVue('reclamations');
            resultatsAffiches = afficherReclamResultats();
        }
    }

    const total = clientsResultats.length + equipResultats.length + reclamResultats.length;
    if (resultatsAffiches > 0) {
        toast(`${resultatsAffiches} resultat(s) dans cette vue (${total} total)`, 'info');
    } else if (total > 0) {
        toast(`Aucun resultat dans cette vue. ${total} resultat(s) ailleurs.`, 'warning');
    } else {
        toast('Aucun resultat trouve', 'warning');
    }
};

// --- CONFIGURATION AGENT & ENTITE‰ ---
// Initialiser l'etat pour agent et entite si non defini
if (!state.agent) state.agent = { nom: '', prenom: '', matricule: '' };
if (!state.entite) state.entite = { nom: '', code: '' };

// Charger agent et entite depuis localStorage
document.addEventListener('DOMContentLoaded', () => {
    try {
        const agentData = localStorage.getItem('sgc_agent');
        if (agentData) state.agent = JSON.parse(agentData);
        const entiteData = localStorage.getItem('sgc_entite');
        if (entiteData) state.entite = JSON.parse(entiteData);

        // Mettre E  jour le titre si entite definie
        if (state.entite?.nom) {
            const logoSpan = document.querySelector('.logo span');
            if (logoSpan) logoSpan.textContent = state.entite.nom;
        }

        // Remplir les champs config
        if (document.getElementById('configAgentNom')) {
            document.getElementById('configAgentNom').value = state.agent?.nom || '';
            document.getElementById('configAgentPrenom').value = state.agent?.prenom || '';
            document.getElementById('configAgentMatricule').value = state.agent?.matricule || '';
            document.getElementById('configNomEntite').value = state.entite?.nom || '';
            document.getElementById('configCodeEntite').value = state.entite?.code || '';
        }
    } catch (e) {
        console.error('Erreur chargement agent/entite:', e);
    }
});

function sauvegarderConfigAgent() {
    state.agent = {
        nom: document.getElementById('configAgentNom')?.value || '',
        prenom: document.getElementById('configAgentPrenom')?.value || '',
        matricule: document.getElementById('configAgentMatricule')?.value || ''
    };
    localStorage.setItem('sgc_agent', JSON.stringify(state.agent));
    toast('Agent sauvegarde', 'success');
}

function sauvegarderConfigEntite() {
    state.entite = {
        nom: document.getElementById('configNomEntite')?.value || '',
        code: document.getElementById('configCodeEntite')?.value || ''
    };
    localStorage.setItem('sgc_entite', JSON.stringify(state.entite));

    // Mettre E  jour le titre
    const logoSpan = document.querySelector('.logo span');
    if (logoSpan && state.entite.nom) {
        logoSpan.textContent = state.entite.nom;
    }
    toast('Entite sauvegardee', 'success');
}

function getAgentInfo() {
    if (!state.agent?.nom && !state.agent?.prenom) return null;
    return `${state.agent.prenom || ''} ${state.agent.nom || ''}`.trim() +
        (state.agent.matricule ? ` (${state.agent.matricule})` : '');
}

// --- RE‰PERTOIRES ---
function rafraichirRepertoire() {
    const filtreRepWilaya = document.getElementById('filtreRepWilaya');
    if (filtreRepWilaya) {
        const wilayas = [...new Set(state.clients.map(c => c.wilaya).filter(Boolean))];
        filtreRepWilaya.innerHTML = '<option value="">Toutes Wilayas</option>' +
            wilayas.map(w => `<option value="${w}">${w}</option>`).join('');
    }
    filtrerRepertoire();
}

function filtrerRepertoire() {
    const tbody = document.getElementById('repertoireTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const recherche = document.getElementById('rechercheRepertoire')?.value.toLowerCase() || '';
    const statut = document.getElementById('filtreRepStatut')?.value || '';
    const wilaya = document.getElementById('filtreRepWilaya')?.value || '';

    let clients = [...state.clients];

    if (recherche) {
        clients = clients.filter(c =>
            (c.codeClient && c.codeClient.toLowerCase().includes(recherche)) ||
            (c.raisonSociale && c.raisonSociale.toLowerCase().includes(recherche)) ||
            (c.wilaya && c.wilaya.toLowerCase().includes(recherche))
        );
    }
    if (statut) clients = clients.filter(c => (c.statut || 'actif') === statut);
    if (wilaya) clients = clients.filter(c => c.wilaya === wilaya);

    const statutColors = { actif: 'success', suspendu: 'warning', inactif: 'secondary' };
    const statutLabels = { actif: 'Actif', suspendu: 'Suspendu', inactif: 'Inactif' };

    clients.forEach(client => {
        const nbEquip = state.equipements.filter(e => e.clientId === client.id).length;
        const clientStatut = client.statut || 'actif';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${client.codeClient || ''}</strong></td>
            <td>${client.raisonSociale || ''}</td>
            <td>${client.wilaya || '-'}</td>
            <td>${client.district || '-'}</td>
            <td>${client.telephone || client.email || '-'}</td>
            <td><span class="badge badge-${statutColors[clientStatut]}">${statutLabels[clientStatut]}</span></td>
            <td><span class="badge badge-info">${nbEquip}</span></td>
            <td class="actions">
                <button class="btn-secondary btn-sm" onclick="editerClient('${client.id}')" title="Modifier"><i class="fas fa-edit"></i></button>
                <button class="btn-secondary btn-sm" onclick="voirEquipementsClient('${client.id}')" title="E‰quipements"><i class="fas fa-terminal"></i></button>
                <button class="btn-secondary btn-sm ${clientStatut === 'suspendu' ? 'btn-success' : 'btn-warning'}" 
                        onclick="toggleStatutClient('${client.id}')" 
                        title="${clientStatut === 'suspendu' ? 'Reactiver' : 'Suspendre'}">
                    <i class="fas fa-${clientStatut === 'suspendu' ? 'check' : 'pause'}"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    if (clients.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-secondary);">Aucun client</td></tr>';
    }
}

function toggleStatutClient(id) {
    const client = state.clients.find(c => c.id === id);
    if (!client) return;

    const ancienStatut = client.statut || 'actif';
    const nouveauStatut = ancienStatut === 'suspendu' ? 'actif' : 'suspendu';

    client.statut = nouveauStatut;

    // Ajouter E  l'historique avec agent
    if (!client.historique) client.historique = [];
    client.historique.push({
        date: new Date().toISOString(),
        action: nouveauStatut === 'suspendu' ? 'suspension' : 'reactivation',
        agent: getAgentInfo(),
        details: `Statut change de ${ancienStatut} vers ${nouveauStatut}`
    });

    sauvegarderVersLocalStorage();
    filtrerRepertoire();
    toast(`Client ${nouveauStatut === 'suspendu' ? 'suspendu' : 'reactive'}`, 'success');
}

// --- IMPORT DYNAMIQUE AME‰LIORE‰ ---
// Reecriture de l'import pour gerer les colonnes inconnues
const mappingColonnesConnues = {
    'code station': 'codeClient',
    'code': 'codeClient',
    'raison social': 'raisonSociale',
    'raison sociale': 'raisonSociale',
    'client': 'raisonSociale',
    'wilaya': 'wilaya',
    'district': 'district',
    'entite commerciale': 'entiteCommerciale',
    'N serie tpe': 'numeroSerie',
    'numero serie': 'numeroSerie',
    'serie': 'numeroSerie',
    'marque': 'marque',
    'modele': 'modele',
    'type': 'type',
    'etat': 'etat',
    'etat tpe': 'etat',
    'mode operation': 'modeOperation',
    'N serie sim': 'numeroSIM',
    'carte gestion': 'carteGestion'
};

function detecterMappingColonne(nomColonne) {
    const nomNormalise = nomColonne.toLowerCase().trim()
        .replace(/[eee]/g, 'e').replace(/[E a]/g, 'a').replace(/[Â°]/g, ' ');

    for (const [pattern, champ] of Object.entries(mappingColonnesConnues)) {
        if (nomNormalise.includes(pattern)) return { champ, type: 'connu' };
    }
    return { champ: nomColonne, type: 'inconnu' };
}

// Ameliorer l'apercu d'import avec mapping dynamique
const originalAfficherApercu = typeof afficherApercuImport !== 'undefined' ? afficherApercuImport : null;

function afficherMappingDynamique(colonnes) {
    const container = document.getElementById('mappingContainer');
    if (!container) return;

    container.innerHTML = '';

    colonnes.forEach((col, idx) => {
        const mapping = detecterMappingColonne(col);
        const div = document.createElement('div');
        div.className = 'mapping-row';
        div.innerHTML = `
            <label>${col}</label>
            <select id="mapping_${idx}" data-original="${col}">
                <option value="">-- Ignorer --</option>
                <option value="codeClient" ${mapping.champ === 'codeClient' ? 'selected' : ''}>Code Client</option>
                <option value="raisonSociale" ${mapping.champ === 'raisonSociale' ? 'selected' : ''}>Raison Sociale</option>
                <option value="wilaya" ${mapping.champ === 'wilaya' ? 'selected' : ''}>Wilaya</option>
                <option value="district" ${mapping.champ === 'district' ? 'selected' : ''}>District</option>
                <option value="numeroSerie" ${mapping.champ === 'numeroSerie' ? 'selected' : ''}>N Serie TPE</option>
                <option value="marque" ${mapping.champ === 'marque' ? 'selected' : ''}>Marque</option>
                <option value="modele" ${mapping.champ === 'modele' ? 'selected' : ''}>Modele</option>
                <option value="etat" ${mapping.champ === 'etat' ? 'selected' : ''}>E‰tat</option>
                <option value="custom" ${mapping.type === 'inconnu' ? 'selected' : ''}>â†’ Champ Personnalise</option>
            </select>
            ${mapping.type === 'inconnu' ? '<span class="badge badge-warning" style="margin-left:10px;">Nouveau</span>' : ''}
        `;
        container.appendChild(div);
    });
}

// Mettre E  jour la navigation pour inclure repertoires
const ancienAfficherVue = afficherVue;
afficherVue = function (vue) {
    ancienAfficherVue(vue);
    if (vue === 'repertoires') rafraichirRepertoire();
    if (vue === 'config') {
        // Recharger les valeurs config
        if (document.getElementById('configAgentNom')) {
            document.getElementById('configAgentNom').value = state.agent?.nom || '';
            document.getElementById('configAgentPrenom').value = state.agent?.prenom || '';
            document.getElementById('configAgentMatricule').value = state.agent?.matricule || '';
            document.getElementById('configNomEntite').value = state.entite?.nom || '';
            document.getElementById('configCodeEntite').value = state.entite?.code || '';
        }
    }
};

// Mise E  jour des titres de navigation
const anciensLabelsTitres = {
    repertoires: ['Repertoires', 'Gestion des clients et contacts'],
    'donnees-brutes': ['Donnees Brutes', 'Donnees importees non traitees']
};

// --- DONNE‰ES BRUTES ---
// Stockage des donnees brutes dans localStorage
function sauvegarderDonneesBrutes(headers, rows) {
    const data = { headers, rows, importDate: new Date().toISOString() };
    localStorage.setItem('sgc_donnees_brutes', JSON.stringify(data));
    rafraichirDonneesBrutes();
}

function chargerDonneesBrutes() {
    try {
        const data = localStorage.getItem('sgc_donnees_brutes');
        return data ? JSON.parse(data) : null;
    } catch (e) {
        return null;
    }
}

function rafraichirDonneesBrutes() {
    const data = chargerDonneesBrutes();
    const thead = document.getElementById('donneesBrutesHeaders');
    const tbody = document.getElementById('donneesBrutesBody');
    const info = document.getElementById('donneesBrutesInfo');
    const empty = document.getElementById('donneesBrutesEmpty');
    const table = document.getElementById('tableDonneesBrutes');

    if (!thead || !tbody) return;

    if (!data || !data.rows || data.rows.length === 0) {
        if (table) table.style.display = 'none';
        if (empty) empty.style.display = 'block';
        if (info) info.textContent = '';
        return;
    }

    if (table) table.style.display = 'table';
    if (empty) empty.style.display = 'none';

    // Info
    const importDate = new Date(data.importDate).toLocaleString('fr-FR');
    if (info) info.textContent = `${data.rows.length} lignes â€¢ ${data.headers.length} colonnes â€¢ Importe le ${importDate}`;

    // Headers
    thead.innerHTML = '<tr>' + data.headers.map(h => `<th>${h || ''}</th>`).join('') + '</tr>';

    // Body (limiter E  500 lignes pour performance)
    tbody.innerHTML = '';
    data.rows.slice(0, 500).forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = data.headers.map((_, idx) => `<td>${row[idx] !== undefined && row[idx] !== null ? row[idx] : ''}</td>`).join('');
        tbody.appendChild(tr);
    });

    if (data.rows.length > 500) {
        toast(`Affichage limite E  500 lignes sur ${data.rows.length}`, 'warning');
    }
}

function effacerDonneesBrutes() {
    if (!confirm('Effacer les donnees brutes importees ?')) return;
    localStorage.removeItem('sgc_donnees_brutes');
    rafraichirDonneesBrutes();
    toast('Donnees brutes effacees', 'success');
}

function exporterDonneesBrutes(format) {
    const data = chargerDonneesBrutes();
    if (!data) {
        toast('Aucune donnee brute E  exporter', 'warning');
        return;
    }

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');

    if (format === 'excel') {
        const ws = XLSX.utils.aoa_to_sheet([data.headers, ...data.rows]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Donnees Brutes');
        XLSX.writeFile(wb, `DonneesBrutes_${dateStr}_${timeStr}.xlsx`);
        toast('Export Excel termine', 'success');
    } else if (format === 'html') {
        const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Donnees Brutes - ${dateStr}</title>
<style>body{font-family:Arial,sans-serif;padding:20px;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px;}th{background:#6366f1;color:white;}</style>
</head>
<body>
<h1>Donnees Brutes Importees</h1>
<p>Exporte le ${now.toLocaleString('fr-FR')} â€¢ ${data.rows.length} lignes</p>
<table><thead><tr>${data.headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
<tbody>${data.rows.map(r => `<tr>${data.headers.map((_, i) => `<td>${r[i] || ''}</td>`).join('')}</tr>`).join('')}</tbody>
</table></body></html>`;
        const blob = new Blob([html], { type: 'text/html' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `DonneesBrutes_${dateStr}_${timeStr}.html`;
        a.click();
        toast('Export HTML termine', 'success');
    }
}

// Mettre E  jour afficherVue pour inclure donnees-brutes
const ancienAfficherVue2 = afficherVue;
afficherVue = function (vue) {
    ancienAfficherVue2(vue);
    if (vue === 'donnees-brutes') rafraichirDonneesBrutes();
};

// Charger donnees brutes au demarrage
document.addEventListener('DOMContentLoaded', () => {
    rafraichirDonneesBrutes();
});

// --- RESPONSIVE MOBILE MENU ---
function toggleMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (sidebar && overlay) {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');

        // Toggle menu icon
        const menuToggle = document.getElementById('menuToggle');
        if (menuToggle) {
            const icon = menuToggle.querySelector('i');
            if (sidebar.classList.contains('open')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        }
    }
}

// Fermer le menu mobile quand on clique sur un lien de navigation
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                const sidebar = document.getElementById('sidebar');
                const overlay = document.getElementById('sidebarOverlay');
                if (sidebar && sidebar.classList.contains('open')) {
                    sidebar.classList.remove('open');
                    overlay.classList.remove('active');
                    const menuToggle = document.getElementById('menuToggle');
                    if (menuToggle) {
                        menuToggle.querySelector('i').classList.remove('fa-times');
                        menuToggle.querySelector('i').classList.add('fa-bars');
                    }
                }
            }
        });
    });
});

console.log('SGC-MineGesty Extensions v4.1 chargees - Responsive Mobile/Tablette');
