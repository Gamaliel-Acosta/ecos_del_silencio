
export type MissionId = "lunar-rover" | "opportunity" | "pioneer-10";

export interface MissionProgress {
    missionId: MissionId;
    collectedParts: number;
    totalParts: number;
    completed: boolean;
    updatedAt: number;
}

export interface GlobalProgress {
    missions: Record<MissionId, MissionProgress>;
}

const STORAGE_KEY = "ecos-del-silencio-progress";

const createInitialProgress = (): GlobalProgress => ({
    missions: {
        "lunar-rover": {
            missionId: "lunar-rover",
            collectedParts: 0,
            totalParts: 5,
            completed: false,
            updatedAt: Date.now(),
        },
        opportunity: {
            missionId: "opportunity",
            collectedParts: 0,
            totalParts: 5,
            completed: false,
            updatedAt: Date.now(),
        },
        "pioneer-10": {
            missionId: "pioneer-10",
            collectedParts: 0,
            totalParts: 10,
            completed: false,
            updatedAt: Date.now(),
        },
    },
});

export const getProgress = (): GlobalProgress => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) return createInitialProgress();

        const parsed = JSON.parse(saved) as GlobalProgress;
        const initial = createInitialProgress();

        return {
            missions: {
                ...initial.missions,
                ...parsed.missions,
            },
        };
    } catch {
        return createInitialProgress();
    }
};

const saveProgress = (progress: GlobalProgress): void => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
        console.warn("No fue posible guardar el progreso.");
    }
};

export const updateMissionProgress = (
    missionId: MissionId,
    collectedParts: number,
): GlobalProgress => {
    const progress = getProgress();
    const current = progress.missions[missionId];

    if (!current) return progress;

    // Evita guardar avances si la misión ya está marcada como completada.
    if (current.completed) return progress;

    progress.missions[missionId] = {
        ...current,
        collectedParts: Math.max(
            0,
            Math.min(Math.floor(collectedParts), current.totalParts),
        ),
        updatedAt: Date.now(),
    };

    saveProgress(progress);
    return progress;
};

export const completeMission = (
    missionId: MissionId,
): GlobalProgress => {
    const progress = getProgress();
    const current = progress.missions[missionId];

    if (!current) return progress;

    // La victoria reinicia la memoria de la misión
    // para permitir que el jugador vuelva a iniciarla.
    progress.missions[missionId] = {
        ...current,
        collectedParts: 0,
        completed: false,
        updatedAt: Date.now(),
    };

    saveProgress(progress);
    return progress;
};

export const getMissionProgress = (
    missionId: MissionId,
): MissionProgress => {
    return getProgress().missions[missionId];
};

export const resetMissionProgress = (
    missionId: MissionId,
): GlobalProgress => {
    const progress = getProgress();
    const current = progress.missions[missionId];

    if (!current) return progress;

    progress.missions[missionId] = {
        ...current,
        collectedParts: 0,
        completed: false,
        updatedAt: Date.now(),
    };

    saveProgress(progress);
    return progress;
};

export const getGlobalPercentage = (): number => {
    const progress = getProgress();
    const missions = Object.values(progress.missions);

    const totalParts = missions.reduce(
        (total, mission) => total + mission.totalParts,
        0,
    );

    const collectedParts = missions.reduce(
        (total, mission) => total + mission.collectedParts,
        0,
    );

    return totalParts === 0
        ? 0
        : Math.round((collectedParts / totalParts) * 100);
};

export const resetProgress = (): void => {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        console.warn("No fue posible reiniciar el progreso.");
    }
};
