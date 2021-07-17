import { getCompressionKey, IndexManifest } from '../index-manifest';
import { ByteBuffer } from '@runejs/core/buffer';
import * as CRC32 from 'crc-32';
import { compressFile } from '../../compression';
import { logger } from '@runejs/core';
import { createHash } from 'crypto';


export interface FileCompressionOptions {
    cached?: boolean;
}


export abstract class IndexedFile {

    public readonly indexManifest: IndexManifest;
    public readonly fileId: number;
    public fileData: ByteBuffer | undefined;

    protected _fileDataCompressed: boolean = false;

    public constructor(indexManifest: IndexManifest,
                       fileId: number,
                       fileData?: ByteBuffer | undefined) {
        this.indexManifest = indexManifest;
        this.fileId = fileId;
        this.fileData = fileData;
    }

    public abstract packFileData(): ByteBuffer | undefined | Promise<ByteBuffer | undefined>;

    public async loadUncompressedFile(): Promise<ByteBuffer> {
        this.fileData = await this.packFileData();
        this._fileDataCompressed = false;
        return this.fileData;
    }

    public async compress(options?: FileCompressionOptions): Promise<ByteBuffer> {
        if(this.fileDataCompressed && this.fileData?.length && options?.cached) {
            return this.fileData;
        }

        const uncompressedFile = await this.loadUncompressedFile();

        if(!uncompressedFile?.length) {
            return null;
        }

        try {
            this.fileData = compressFile({
                buffer: uncompressedFile,
                compression: this.fileCompression,
                version: this.fileVersion
            });
            this._fileDataCompressed = true;
            return this.fileData;
        } catch(error) {
            logger.error(`Error compressing file ${this.fileId} within index ${this.indexManifest.indexId}:`);
            logger.error(error);
            this._fileDataCompressed = false;
            return null;
        }
    }

    public async generateCrc32(): Promise<number | undefined> {
        const fileData = await this.compress({ cached: true });
        if(!fileData?.length) {
            return undefined;
        }

        return CRC32.buf(this.fileVersion !== undefined ?
            fileData.slice(0, fileData.length - 2) : fileData);
    }

    public async generateShaHash(): Promise<string | undefined> {
        const hash = createHash('sha256');
        const fileData = await this.compress({ cached: true });
        if(!fileData?.length) {
            return undefined;
        }

        return hash.update(this.fileVersion !== undefined ?
            fileData.slice(0, fileData.length - 2) : fileData).digest('hex');
    }

    public async getCompressedFileLength(): Promise<number | undefined> {
        const fileData = await this.compress({ cached: true });
        if(!fileData?.length) {
            return undefined;
        }

        return fileData?.length ?? undefined;
    }

    public static async generateCrc32(fileData: ByteBuffer): Promise<number | undefined> {
        if(!fileData?.length) {
            return undefined;
        }

        return CRC32.buf(fileData);
    }

    public static async generateShaHash(fileData: ByteBuffer): Promise<string | undefined> {
        if(!fileData?.length) {
            return undefined;
        }

        const hash = createHash('sha256');
        return hash.update(fileData).digest('hex');
    }

    public get fullFileName(): string {
        return this.indexManifest?.files[this.fileId]?.file ?? '';
    }

    public get fileName(): string {
        return (this.indexManifest?.files[this.fileId]?.file ?? '')
            .replace(this.indexManifest.fileExtension, '');
    }

    public get fileVersion(): number | undefined {
        return this.indexManifest?.files[this.fileId]?.version ?? undefined;
    }

    public get fileCompression(): number {
        return getCompressionKey(this.indexManifest.fileCompression);
    }

    public get fileDataCompressed(): boolean {
        return this._fileDataCompressed;
    }

}
