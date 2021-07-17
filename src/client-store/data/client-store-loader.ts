import { ByteBuffer } from '@runejs/core/buffer';
import { readFileSync } from 'fs';
import { join } from 'path';


export interface ClientStoreChannel {
    dataChannel: ByteBuffer;
    indexChannels: ByteBuffer[];
    metaChannel: ByteBuffer;
}

export const loadClientStore = (dir: string): ClientStoreChannel => {
    const dataChannel = new ByteBuffer(readFileSync(join(dir, 'main_file_cache.dat2')));
    const indexChannels = [];

    for(let i = 0; i < 254; i++) {
        try {
            const index = new ByteBuffer(readFileSync(join(dir, `main_file_cache.idx${i}`)));
            indexChannels.push(index);
        } catch(error) {
            break;
        }
    }

    const metaChannel = new ByteBuffer(readFileSync(join(dir, 'main_file_cache.idx255')));

    return {
        dataChannel,
        indexChannels,
        metaChannel
    };
};
