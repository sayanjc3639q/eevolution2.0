// Centralized data fetcher for EEvolution 2.0
async function fetchJSONData() {
    try {
        const urls = {
            students: 'data/students.json',
            donators: 'data/donators.json',
            subjects: 'data/subjects.json',
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

        // --- MIGRATION: Fetch from Supabase ---
        if (window.supabaseClient) {
            try {
                // Fetch Study Materials
                const { data: supabaseMaterials, error: matError } = await supabaseClient
                    .from('study_materials')
                    .select('*');

                if (!matError && supabaseMaterials) {
                    siteData.studyMaterials = supabaseMaterials.map(m => ({
                        ...m,
                        subjectId: m.subject_id,
                        desc: m.description
                    }));
                } else {
                    siteData.studyMaterials = [];
                }

                // Fetch Notices
                const { data: supabaseNotices, error: noticeError } = await supabaseClient
                    .from('notices')
                    .select('*')
                    .order('date', { ascending: false });

                if (!noticeError && supabaseNotices) {
                    siteData.notices = supabaseNotices;
                } else {
                    siteData.notices = [];
                }

                // Fetch Events
                const { data: supabaseEvents, error: eventError } = await supabaseClient
                    .from('events')
                    .select('*')
                    .order('date', { ascending: true });

                if (!eventError && supabaseEvents) {
                    siteData.events = supabaseEvents.map(e => ({
                        ...e,
                        desc: e.description
                    }));
                } else {
                    siteData.events = [];
                }


                // Fetch Donations
                const { data: supabaseDonations, error: donError } = await supabaseClient
                    .from('donations')
                    .select('*')
                    .order('date', { ascending: false });

                if (!donError && supabaseDonations && supabaseDonations.length > 0) {
                    siteData.donators = supabaseDonations.map(d => ({
                        name: d.name,
                        amount: `₹${d.amount}`,
                        date: d.date
                    }));
                }
                // If supabase is empty, siteData.donators remains from donators.json (initial fetch)

            } catch (err) {
                console.warn("Could not fetch data from Supabase.", err);
                siteData.studyMaterials = siteData.studyMaterials || [];
                siteData.notices = siteData.notices || [];
                siteData.events = siteData.events || [];
            }
        }

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
