import { ClientStoreChannel, loadClientStore } from './data';
import { FileIndex} from './file-index';
import { getFileNames, XteaRegion } from './util';
import {
    SpriteStore, MusicStore, BinaryStore, JingleStore, SoundStore,
    RegionStore, ConfigStore, ModelStore, WidgetStore, FontStore,
    TextureStore, ItemStore, NpcStore, ObjectStore, XteaDefinition,
    VarbitStore
} from './stores';
import { indexIdMap, IndexName } from '../file-store/index-manifest';


export let fileNames: { [ key: string ]: string | null };

export const getFileName = (nameHash: number): string | null => {
    if(!nameHash) {
        return null;
    }
    return fileNames[nameHash.toString()] || nameHash.toString();
};


export class ClientFileStore {

    public readonly filestoreDir: string;
    public readonly configDir: string;

    public readonly binaryStore: BinaryStore;
    public readonly configStore: ConfigStore;
    public readonly fontStore: FontStore;
    public readonly jingleStore: JingleStore;
    public readonly modelStore: ModelStore;
    public readonly musicStore: MusicStore;
    public readonly regionStore: RegionStore;
    public readonly soundStore: SoundStore;
    public readonly spriteStore: SpriteStore;
    public readonly widgetStore: WidgetStore;
    public readonly textureStore: TextureStore;

    public readonly channels: ClientStoreChannel;

    public readonly indexes = new Map<number, FileIndex>();

    public readonly xteas: { [key: number]: XteaDefinition };

    public constructor(
            filestoreDir: string,
            options?: {
                configDir?: string,
                xteas?: { [key: number]: XteaDefinition }
            }
        ) {
        this.filestoreDir = filestoreDir;
        this.configDir = options?.configDir || filestoreDir;
        this.xteas = options?.xteas || {};
        this.channels = loadClientStore(filestoreDir);

        fileNames = getFileNames(this.configDir);

        this.binaryStore = new BinaryStore(this);
        this.configStore = new ConfigStore(this);
        this.fontStore = new FontStore(this);
        this.jingleStore = new JingleStore(this);
        this.modelStore = new ModelStore(this);
        this.musicStore = new MusicStore(this);
        this.regionStore = new RegionStore(this, options?.xteas);
        this.soundStore = new SoundStore(this);
        this.spriteStore = new SpriteStore(this);
        this.widgetStore = new WidgetStore(this);
        this.textureStore = new TextureStore(this);

        this.fontStore.loadFonts();
    }

    /**
     * Fetches the specified File Index.
     * @param indexId The string or numberic ID of the File Index to find.
     */
    public getIndex(indexId: number | IndexName): FileIndex {
        if(typeof indexId !== 'number') {
            indexId = indexIdMap[indexId];
        }

        if(!this.indexes.has(indexId)) {
            const index = new FileIndex(this, indexId, this.channels);
            index.decodeIndex();
            this.indexes.set(indexId, index);

            return index;
        } else {
            return this.indexes.get(indexId);
        }
    }

    public getAllIndexes(): FileIndex[] {
        const indexNames = Object.keys(indexIdMap);
        const indexes = new Array(indexNames.length) as FileIndex[];
        indexNames.forEach(indexName => {
            const indexId: number = indexIdMap[indexName];
            indexes[indexId] = this.getIndex(indexId);
        });

        return indexes;
    }

    public get itemStore(): ItemStore {
        return this.configStore?.itemStore;
    }

    public get varbitStore(): VarbitStore {
        return this.configStore?.varbitStore;
    }

    public get npcStore(): NpcStore {
        return this.configStore?.npcStore;
    }

    public get objectStore(): ObjectStore {
        return this.configStore?.objectStore;
    }

}
