export function classifyItem({ name = '', description = '', condition = '', weight_kg = 0 }) {
	const text = `${name} ${description}`.toLowerCase();
	let category_key = 'recyclable';
	let hazardous = 0;
	let recyclable = 1;
	let reusable = 0;
	let recommended_vendor_type = 'recycler';

	const hazardousKeywords = ['battery', 'lithium', 'acid', 'crt', 'mercury', 'chemical', 'biohazard'];
	const reusableKeywords = ['working', 'good', 'intact', 'functional', 'refurbish'];
	const donateKeywords = ['monitor', 'keyboard', 'mouse', 'router'];
	const recyclableKeywords = ['laptop', 'mobile', 'computer', 'projector', 'printer', 'scanner', 'cable', 'adapter'];

	if (hazardousKeywords.some(k => text.includes(k))) {
		category_key = 'hazardous';
		hazardous = 1;
		recyclable = 0;
		recommended_vendor_type = 'hazardous';
	} else if (reusableKeywords.some(k => text.includes(k)) && !text.includes('broken') && (condition || '').toLowerCase().includes('good')) {
		category_key = 'reusable';
		reusable = 1;
		recommended_vendor_type = 'refurbisher';
	} else if (recyclableKeywords.some(k => text.includes(k))) {
		category_key = 'recyclable';
		recommended_vendor_type = 'recycler';
	}

	// Heavy items more likely for recycler logistics
	if (weight_kg >= 20 && category_key === 'reusable') {
		category_key = 'recyclable';
		reusable = 0;
	}

	return { category_key, hazardous, recyclable, reusable, recommended_vendor_type };
}