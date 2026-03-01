// Centralized data fetcher for EEvolution 2.0
async function fetchJSONData() {
    try {
        const urls = {
            notices: 'data/notices.json',
            students: 'data/students.json',
            donators: 'data/donators.json',
            events: 'data/events.json',
            subjects: 'data/subjects.json',
            studyMaterials: 'data/studyMaterials.json',
            reviews: 'data/reviews.json',
            schedule: 'data/scheduleData.json'
        };

        const fetchPromises = Object.entries(urls).map(async ([key, url]) => {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${url}`);
            }
            return [key, await response.json()];
        });

        const results = await Promise.all(fetchPromises);

        // Convert array of entries back into a single object
        const siteData = Object.fromEntries(results);
        return siteData;

    } catch (error) {
        console.error("Error loading JSON data:", error);
        // Return empty fallback arrays strictly to prevent app crashes if fetch fails
        return {
            notices: [],
            students: [],
            donators: [],
            events: [],
            subjects: { theory: [], lab: [] },
            studyMaterials: [],
            reviews: [],
            schedule: { routine: {}, holidays: [], unlistedHolidays: [], exams: [] }
        };
    }
}
