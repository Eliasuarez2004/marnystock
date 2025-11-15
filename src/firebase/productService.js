// src/firebase/productService.js (RE-ARQUITECTADO)
import { db, storage } from './config';
import { collection, doc, writeBatch, onSnapshot, getDoc, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { nanoid } from 'nanoid';

const PRODUCTS_COLLECTION = 'products';

// Sube una imagen (sin cambios)
const uploadImage = async (imageFile) => {
    const uniqueId = nanoid();
    const imageRef = ref(storage, `products/${uniqueId}-${imageFile.name}`);
    await uploadBytes(imageRef, imageFile);
    return await getDownloadURL(imageRef);
};

// --- NUEVAS FUNCIONES PARA GESTIÓN DE PRODUCTOS Y LOTES ---

// 1. CREA O ACTUALIZA LA INFORMACIÓN GENERAL DE UN PRODUCTO (sin stock)
export const saveProductInfo = async (productData, imageFile) => {
    const batch = writeBatch(db);
    const productRef = productData.id ? doc(db, PRODUCTS_COLLECTION, productData.id) : doc(collection(db, PRODUCTS_COLLECTION));

    let imageUrl = productData.imageUrl || '';
    if (imageFile) {
        imageUrl = await uploadImage(imageFile);
    }

    const dataToSave = {
        name: productData.name,
        description: productData.description,
        price: productData.price, // Mantenemos el precio de venta sugerido aquí
        imageUrl: imageUrl,
    };

    if (productData.id) {
        batch.update(productRef, dataToSave);
    } else {
        batch.set(productRef, dataToSave);
    }
    await batch.commit();
};

// 2. AÑADE UN NUEVO LOTE A UN PRODUCTO EXISTENTE (ESTA ES LA "ENTRADA DE INVENTARIO")
export const addBatchToProduct = async (productId, batchData) => {
    const batchRef = doc(collection(db, PRODUCTS_COLLECTION, productId, 'batches'));
    await writeBatch(db).set(batchRef, batchData).commit();
};

// 3. OBTIENE TODOS LOS PRODUCTOS CON SUS LOTES ANIDADOS
export const getProductsWithBatches = (callback) => {
    const productsCollection = collection(db, PRODUCTS_COLLECTION);
    
    return onSnapshot(productsCollection, async (snapshot) => {
        const productsPromises = snapshot.docs.map(async (productDoc) => {
            const product = { id: productDoc.id, ...productDoc.data() };
            
            const batchesCollection = collection(db, PRODUCTS_COLLECTION, product.id, 'batches');
            const batchesSnapshot = await getDocs(batchesCollection);
            
            product.batches = batchesSnapshot.docs.map(batchDoc => ({ id: batchDoc.id, ...batchDoc.data() }));
            
            return product;
        });
        
        const productsWithBatches = await Promise.all(productsPromises);
        callback(productsWithBatches);
    });
};

// 4. ELIMINA UN PRODUCTO Y TODOS SUS LOTES Y SU IMAGEN
export const deleteProductAndBatches = async (product) => {
    const batch = writeBatch(db);

    // Borrar todos los lotes de la sub-colección
    if (product.batches && product.batches.length > 0) {
        product.batches.forEach(b => {
            const batchRef = doc(db, PRODUCTS_COLLECTION, product.id, 'batches', b.id);
            batch.delete(batchRef);
        });
    }
    
    // Borrar el documento principal del producto
    const productRef = doc(db, PRODUCTS_COLLECTION, product.id);
    batch.delete(productRef);

    await batch.commit();

    // Borrar la imagen de Storage si existe
    if (product.imageUrl) {
        const imageRef = ref(storage, product.imageUrl);
        try {
            await deleteObject(imageRef);
        } catch (error) {
            console.error("Error al borrar imagen:", error);
        }
    }
};

// 4. AÑADE UNA ENTRADA DE MÚLTIPLES PRODUCTOS/LOTES EN UNA SOLA TRANSACCIÓN
export const addMultiProductBatchEntry = async (entryData) => {
    const { lotNumber, expiryDate, supplier, items } = entryData;
    const batch = writeBatch(db);

    items.forEach(item => {
        const batchRef = doc(collection(db, PRODUCTS_COLLECTION, item.productId, 'batches'));
        const batchData = {
            lotNumber,
            expiryDate,
            supplier,
            purchaseDate: new Date().toISOString().split('T')[0],
            quantitySPS: Number(item.quantitySPS) || 0,
            quantityTGU: Number(item.quantityTGU) || 0,
        };
        batch.set(batchRef, batchData);
    });

    await batch.commit();
};