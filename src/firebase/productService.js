// src/firebase/productService.js 
import { db, storage } from './config';
import { collection, doc, writeBatch, onSnapshot, getDocs, query, where } from 'firebase/firestore';
import { ref, deleteObject, uploadBytes, getDownloadURL } from 'firebase/storage';
import { nanoid } from 'nanoid';

const PRODUCTS_COLLECTION = 'products';
const INVENTORY_LOTS_COLLECTION = 'inventory_lots';

const uploadImage = async (imageFile) => {
    const uniqueId = nanoid();
    // Creamos un nombre de archivo único para evitar colisiones
    const imageRef = ref(storage, `products/${uniqueId}-${imageFile.name}`);
    await uploadBytes(imageRef, imageFile);
    return await getDownloadURL(imageRef);
};


const deleteImage = async (imageUrl) => {
    if (!imageUrl) return; // Si no hay URL, no hay nada que borrar
    try {
        const imageRef = ref(storage, imageUrl);
        await deleteObject(imageRef);
    } catch (error) {
        // Ignoramos errores si el archivo no existe, que es común
        if (error.code !== 'storage/object-not-found') {
            console.error("Error al borrar la imagen antigua:", error);
        }
    }
};

// --- FUNCIÓN saveProductInfo CORREGIDA Y MEJORADA ---
export const saveProductInfo = async (productData, imageFile) => {
    const isEditing = !!productData.id;
    const productRef = isEditing ? doc(db, PRODUCTS_COLLECTION, productData.id) : doc(collection(db, PRODUCTS_COLLECTION));
    
    let dataToSave = {
        name: productData.name,
        description: productData.description,
        price: Number(productData.price), // Asegurarse de que el precio sea un número
    };

    if (imageFile) {
        // Si el usuario subió una nueva imagen
        if (isEditing && productData.imageUrl) {
            // Si estamos editando y había una imagen antigua, la borramos
            await deleteImage(productData.imageUrl);
        }
        // Subimos la nueva imagen y obtenemos su URL
        dataToSave.imageUrl = await uploadImage(imageFile);
    } else {
        // Si no se subió una nueva imagen, mantenemos la que ya existía (si la hay)
        dataToSave.imageUrl = productData.imageUrl || '';
    }

    const batch = writeBatch(db);
    if (isEditing) {
        batch.update(productRef, dataToSave);
    } else {
        batch.set(productRef, dataToSave);
    }
    await batch.commit();
};

// Obtiene la lista de "tipos de producto"
export const getProductTypesStream = (callback) => {
    const productsRef = collection(db, PRODUCTS_COLLECTION);
    return onSnapshot(productsRef, (snapshot) => {
        const productTypes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(productTypes);
    });
};

// Elimina un producto, sus lotes y su imagen
export const deleteProductAndBatches = async (product) => {
    // Primero, borramos la imagen del storage
    await deleteImage(product.imageUrl);

    const batch = writeBatch(db);

    // Borramos todos los lotes de la sub-colección (si existieran)
    if (product.batches && product.batches.length > 0) {
        product.batches.forEach(b => {
            const batchRef = doc(db, PRODUCTS_COLLECTION, product.id, 'batches', b.id);
            batch.delete(batchRef);
        });
    }
    
    // Borramos el documento principal del producto
    const productRef = doc(db, PRODUCTS_COLLECTION, product.id);
    batch.delete(productRef);

    await batch.commit();
};

// --- ¡FUNCIÓN DE BORRADO CORREGIDA Y MEJORADA! ---
export const deleteProductAndAssociatedLots = async (product) => {
    // Primero, borramos la imagen del storage
    if (product.imageUrl) {
        const imageRef = ref(storage, product.imageUrl);
        try {
            await deleteObject(imageRef);
        } catch (error) {
            if (error.code !== 'storage/object-not-found') console.error("Error al borrar imagen:", error);
        }
    }

    const batch = writeBatch(db);

    // 1. Buscar todos los lotes asociados a este tipo de producto
    const lotsQuery = query(collection(db, INVENTORY_LOTS_COLLECTION), where("productId", "==", product.id));
    const lotsSnapshot = await getDocs(lotsQuery);

    // 2. Añadir cada lote encontrado a la operación de borrado
    lotsSnapshot.forEach(lotDoc => {
        batch.delete(lotDoc.ref);
    });

    // 3. Añadir el documento principal del "tipo de producto" a la operación de borrado
    const productRef = doc(db, PRODUCTS_COLLECTION, product.id);
    batch.delete(productRef);

    // 4. Ejecutar todas las operaciones de borrado atómicamente
    await batch.commit();
};
