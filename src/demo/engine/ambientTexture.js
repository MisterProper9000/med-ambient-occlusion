import MaterialAO from './gfx/matAO';
import TetrahedronGenerator from './actvolume/tetra';
import * as THREE from 'three';

/**
 * 3D ambient texture processing engine
 * @module lib/scripts/graphics3d/ambientTexture
 */
export default class AmbientTexture {
  constructor(inParams) {
    //this.rendererBlur.render(this.sceneBlur, this.cameraOrtho
    this.rendererBlur = inParams.renderer;
    this.sceneBlur = inParams.scene;
    this.cameraOrtho = inParams.camera;
    this.xDim = inParams.xDim;
    this.yDim = inParams.yDim;
    this.zDim = inParams.zDim;
    this.texVolumeAO = null;
    this.vectorsTex = null;
  }
  _setAOVectorTex() {
    const VAL_4 = 4;
    const VAL_255 = 255;
    const gen = new TetrahedronGenerator();
    const vRadius = new THREE.Vector3(0.5, 0.5, 0.5);
    const NUM_SUBDIVIDES = 2;
    const okCreateTetra = gen.create(vRadius, NUM_SUBDIVIDES);
    if (okCreateTetra < 1) {
      return;
    }
    this.numAOVectors = gen.getNumVertices();

    this.vectors = new Uint8Array(VAL_4 * this.numAOVectors);

    for (let i = 0; i < this.numAOVectors; i++) {
      const vert = gen.getVertex(i);
      this.vectors[i * VAL_4 + 0] = (vert.x + 0.5) * VAL_255;
      this.vectors[i * VAL_4 + 1] = (vert.y + 0.5) * VAL_255;
      this.vectors[i * VAL_4 + 2] = (vert.z + 0.5) * VAL_255;
      this.vectors[i * VAL_4 + 3] = VAL_255;
    }

    this.vectorsTex = new THREE.DataTexture(this.vectors, this.numAOVectors, 1, THREE.RGBAFormat);
    this.vectorsTex.wrapS = THREE.ClampToEdgeWrapping;
    this.vectorsTex.wrapT = THREE.ClampToEdgeWrapping;
    this.vectorsTex.magFilter = THREE.NearestFilter;
    this.vectorsTex.minFilter = THREE.NearestFilter;
    this.vectorsTex.needsUpdate = true;
  }
  set(texVolume, isoThreshold, vol, vol1, vol2, vol3) {
    if (this.vectorsTex === null) {
      this._setAOVectorTex();
    }
    this.xDimAO = this.xDim;
    this.yDimAO = this.yDim;
    this.zDimAO = this.zDim;

    this.vol = vol;
    this.vol1 = vol1;
    this.vol2 = vol2;
    this.vol3 = vol3;

    this.bufferTextureAO = new THREE.WebGLRenderTarget(this.xDimAO,
      this.yDimAO, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        depthBuffer: false,
      });

    this.ambientVolumeTexCPU = new Uint8Array(this.xDimAO * this.yDimAO * this.zDimAO);
    if (this.isWebGL2 === 0) {
      this.texVolumeAO = new THREE.DataTexture(this.ambientVolumeTexCPU, this.xTex, this.yTex, THREE.AlphaFormat);
    } else {
      this.texVolumeAO = new THREE.DataTexture3D(this.ambientVolumeTexCPU, this.xDimAO, this.yDimAO, this.zDimAO);
      this.texVolumeAO.format = THREE.RedFormat;
      //this.texVolumeAO.type = THREE.UnsignedByteType;
    }
    this.texVolumeAO.wrapS = THREE.ClampToEdgeWrapping;
    this.texVolumeAO.wrapT = THREE.ClampToEdgeWrapping;
    this.texVolumeAO.wrapR = THREE.ClampToEdgeWrapping;
    this.texVolumeAO.magFilter = THREE.LinearFilter;
    this.texVolumeAO.minFilter = THREE.LinearFilter;
    this.texVolumeAO.needsUpdate = true;

    const texelSize = new THREE.Vector3(1.0 / this.xDim, 1.0 / this.yDim, 1.0 / this.zDim);
    const matAO = new MaterialAO();
    matAO.create(texVolume, texelSize, this.vectorsTex, this.numAOVectors, isoThreshold, (mat) => {
      this.materialAO = mat;
      mat.uniforms.tileCountX.value = this.zTexDivSqrt;
      mat.uniforms.volumeSizeZ.value = this.zDim;
      this.setAmbientTextureWebGL2();
      this.texVolumeAO.needsUpdate = true;
    });
  }
  hemiSphereProceed(normal, center_x, center_y, center_z, radius, arr, divider) {
    var volume = 0;
    var sum = 0;
    for (let i = Math.max(0, center_x - radius); i <= Math.min(Math.floor(this.xDim / divider) - 1, center_x + radius); i++) {
      for (let j = Math.max(0, center_y - radius); j <= Math.min(Math.floor(this.yDim / divider) - 1, center_y + radius); j++) {
        for (let k = Math.max(0, center_z - radius); k <= Math.min(Math.floor(this.zDim / divider) - 1, center_z + radius); k++) {
          if ((i - center_x) * normal[0] + (j - center_y) * normal[1] + (k - center_z) * normal[2] >= 0) {
            if ((center_x - i) * (center_x - i) + 
              (center_y - j) * (center_y - j) +
              (center_z - k) * (center_z - k) <= radius * radius) {
              sum += Math.sign(arr[k * Math.floor(this.yDim / divider * this.xDim / divider) + j * Math.floor(this.xDim / divider) + i]);
              if(Number.isNaN(sum)){
                console.log("nan at array with length", Math.floor(this.xDim / divider * this.yDim / divider * this.zDim / divider));
              }
            }
            volume++;
          }
        }
      }
    }
    //if (sum != 0 && volume != 0){
    //  console.log("sas,", sum, volume);
    //}
    if (volume == 0) {
      return 0;
    }
    return sum / parseFloat(volume);
  }
  sphereProceed(center_x, center_y, center_z, radius, arr, divider) {
    var volume = 0;
    var sum = 0;
    for (let i = Math.max(0, center_x - radius); i <= Math.min(Math.floor(this.xDim / divider) - 1, center_x + radius); i++) {
      for (let j = Math.max(0, center_y - radius); j <= Math.min(Math.floor(this.yDim / divider) - 1, center_y + radius); j++) {
        for (let k = Math.max(0, center_z - radius); k <= Math.min(Math.floor(this.zDim / divider) - 1, center_z + radius); k++) {
          if ((center_x - i) * (center_x - i) + 
            (center_y - j) * (center_y - j) +
            (center_z - k) * (center_z - k) <= radius * radius) {
            sum += Math.sign(arr[k * Math.floor(this.yDim / divider * this.xDim / divider) + j * Math.floor(this.xDim / divider) + i]);
            if(Number.isNaN(sum)){
              console.log("nan at array with length", Math.floor(this.xDim / divider * this.yDim / divider * this.zDim / divider));
            }
          }
          volume++;
        }
      }
    }
    if (volume == 0) {
      return 0;
    }
    return sum / parseFloat(volume);
  }
  /**
   * mode: 0 - sphereProceed used
   *       otherwise - hemiSphereProceed
   */
  IAO(x, y, z, mode) {
    var normal = new Array(3);
    normal[0] = this.vol[z * this.yDim * this.xDim + y * this.xDim + x - 1] - 
      this.vol[z * this.yDim * this.xDim + y * this.xDim + x + 1];
    normal[1] = this.vol[z * this.yDim * this.xDim + (y - 1) * this.xDim + x] - 
      this.vol[z * this.yDim * this.xDim + (y + 1) * this.xDim + x];
    normal[2] = this.vol[(z - 1) * this.yDim * this.xDim + y * this.xDim + x] - 
      this.vol[(z + 1) * this.yDim * this.xDim + y * this.xDim + x];
    var norm = Math.sqrt(normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2]);
    if (Number.isNaN(normal[0]) || Number.isNaN(normal[1]) || Number.isNaN(normal[2]) ||
      Number.isNaN(norm) || norm == 0){
      return 0;
    }
    normal[0] /= norm;
    normal[1] /= norm;
    normal[2] /= norm;
    var radius = 2
    var final_sum = 0;
    var center_x;
    var center_y;
    var center_z;
    //var total_size = 0
    for (; radius < 4; radius *= 2) {
      if (mode == 0) {
        center_x = Math.round(x + radius * normal[0]);
        center_y = Math.round(y + radius * normal[1]);
        center_z = Math.round(z + radius * normal[2]);
      }
      if (mode == 0) {
        final_sum += this.sphereProceed(center_x, center_y, center_z, radius, this.vol, 1);
      }
      else {
        final_sum += this.hemiSphereProceed(normal, x, y, z, radius, this.vol, 1);
      }
    }

    //radius *= 2;
    x = Math.floor(x / 2);
    y = Math.floor(y / 2);
    z = Math.floor(z / 2);
    if (mode == 0) {
      center_x = Math.round(x + radius * normal[0]);
      center_y = Math.round(y + radius * normal[1]);
      center_z = Math.round(z + radius * normal[2]);
    }
    if (mode == 0) {
      final_sum += this.sphereProceed(center_x, center_y, center_z, radius, this.vol1, 2);
    }
    else {
      final_sum += this.hemiSphereProceed(normal, x, y, z, radius, this.vol1, 2);
    }
    

    //radius *= 2;
    x = Math.floor(x / 2);
    y = Math.floor(y / 2);
    z = Math.floor(z / 2);
    if (mode == 0) {
      center_x = Math.round(x + radius * normal[0]);
      center_y = Math.round(y + radius * normal[1]);
      center_z = Math.round(z + radius * normal[2]);
    }
    if (mode == 0) {
      final_sum += this.sphereProceed(center_x, center_y, center_z, radius, this.vol2, 4);
    }
    else {
      //final_sum += this.hemiSphereProceed(normal, x, y, z, radius, this.vol2, 4);
    }

    //radius *= 2;
    x = Math.floor(x / 2);
    y = Math.floor(y / 2);
    z = Math.floor(z / 2);
    if (mode == 0) {
      center_x = Math.round(x + radius * normal[0]);
      center_y = Math.round(y + radius * normal[1]);
      center_z = Math.round(z + radius * normal[2]);
    }
    if (mode == 0) {
      final_sum += this.sphereProceed(center_x, center_y, center_z, radius, this.vol3, 8);
      final_sum /= 5;
    }
    else {
      //final_sum += this.hemiSphereProceed(normal, x, y, z, radius, this.vol3, 8);
      final_sum /= 3;
    }
    
    if(final_sum > 255) {
      console.log("overfill!", x, y, z)
    }
    if (final_sum >= 1) {
      console.log(final_sum);
    }
    if(final_sum != 0){
      return final_sum;
    }
    return final_sum; //1.0 / (1.0 + Math.pow(Math.E, -10.0 * (final_sum - 0.5)));
  }
  setAmbientTextureWebGL2() {
    //DEFAULT AO
    const VAL_4 = 4;
    const frameBuf = new Uint8Array(VAL_4 * this.xDimAO * this.yDimAO);
    const gl = this.rendererBlur.getContext();
    console.log('AO WebGL2');
    for (let z = 0; z < this.zDimAO; ++z) {
      this.materialAO.uniforms.curZ.value = z / (this.zDimAO - 1);
      this.materialAO.uniforms.curZ.needsUpdate = true;
      this.sceneBlur.overrideMaterial = this.materialAO;
      //this.rendererBlur.render(this.sceneBlur, this.cameraOrtho, this.bufferTextureAO);
      this.sceneBlur.overrideMaterial = null;
      gl.readPixels(0, 0, this.xDimAO, this.yDimAO, gl.RGBA, gl.UNSIGNED_BYTE, frameBuf);
      const zOffs = z * this.xDimAO * this.yDimAO;
      for (let y = 0; y < this.yDimAO; y++) {
        for (let x = 0; x < this.xDimAO; x++) {
          this.ambientVolumeTexCPU[x + y * this.xDimAO + zOffs] = 
            frameBuf[VAL_4 * (x + y * this.xDimAO)]; //256.0 * k / this.zDim;
          if (frameBuf[VAL_4 * (x + y * this.xDimAO)] != 0) {

          }
        }
      }
    }
    console.log('AO WebGL2 End');     
  }
  //MY AO
    /*
    //const VAL_4 = 4;
    //const frameBuf = new Uint8Array(VAL_4 * this.xDimAO * this.yDimAO);
    //const gl = this.rendererBlur.getContext();
    console.log('AO WebGL2');
    for (let z = 0; z < this.zDimAO; ++z) {
      this.materialAO.uniforms.curZ.value = z / (this.zDimAO - 1);
      this.materialAO.uniforms.curZ.needsUpdate = true;
      this.sceneBlur.overrideMaterial = this.materialAO;
      //this.rendererBlur.render(this.sceneBlur, this.cameraOrtho, this.bufferTextureAO);
      this.sceneBlur.overrideMaterial = null;
      //gl.readPixels(0, 0, this.xDimAO, this.yDimAO, gl.RGBA, gl.UNSIGNED_BYTE, frameBuf);
      const zOffs = z * this.xDimAO * this.yDimAO;
      for (let y = 0; y < this.yDimAO; y++) {
        for (let x = 0; x < this.xDimAO; x++) {
          //var a = 255.0 - 255.0 * this.IAO(x, y, z, 1);
          this.ambientVolumeTexCPU[x + y * this.xDimAO + zOffs] = 255.0 - 255.0 * this.IAO(x, y, z, 1);
            // * frameBuf[VAL_4 * (x + y * this.xDimAO)]; 
            //256.0 * x / this.zDim;
        }
      }
    }
    console.log('AO WebGL2 End');
  }*/
  //OUTDATED MY AO
    /*
    //const VAL_4 = 4;
    //const frameBuf = new Uint8Array(VAL_4 * this.xDimAO * this.yDimAO);
    //const gl = this.rendererBlur.getContext();
    console.log('AO WebGL2');
    for (let z = 0; z < this.zDimAO; ++z) {
      this.materialAO.uniforms.curZ.value = z / (this.zDimAO - 1);
      this.materialAO.uniforms.curZ.needsUpdate = true;
      this.sceneBlur.overrideMaterial = this.materialAO;
      //this.rendererBlur.render(this.sceneBlur, this.cameraOrtho, this.bufferTextureAO);
      this.sceneBlur.overrideMaterial = null;
      //gl.readPixels(0, 0, this.xDimAO, this.yDimAO, gl.RGBA, gl.UNSIGNED_BYTE, frameBuf);
      const zOffs = z * this.xDimAO * this.yDimAO;
      for (let y = 0; y < this.yDimAO; y++) {
        for (let x = 0; x < this.xDimAO; x++) {
          //frameBuf[VAL_4 * (x + y * this.xDimAO)];
          if (this.vol[z * this.yDim * this.xDim + y * this.xDim + x] == 0 || 
            (this.vol[z * this.yDim * this.xDim + y * this.xDim + x + 1] != 0 &&
            this.vol[z * this.yDim * this.xDim + y * this.xDim + x - 1] != 0 &&
            this.vol[z * this.yDim * this.xDim + (y - 1) * this.xDim + x] != 0 &&
            this.vol[z * this.yDim * this.xDim + (y + 1) * this.xDim + x] != 0 &&
            this.vol[(z - 1) * this.yDim * this.xDim + y * this.xDim + x] != 0 &&
            this.vol[(z + 1) * this.yDim * this.xDim + y * this.xDim + x] != 0)) {
            this.ambientVolumeTexCPU[x + y * this.xDimAO + zOffs] =
              this.vol[z * this.yDim * this.xDim + y * this.xDim + x];
            continue;
          }

          this.ambientVolumeTexCPU[x + y * this.xDimAO + zOffs] = this.IAO(x, y, z);
          
          //this.ambientVolumeTexCPU[x + y * this.xDimAO + zOffs] =
          //    this.vol[z * this.yDim * this.xDim + y * this.xDim + x];
        }
      }
    }
    console.log('AO WebGL2 End');
  }*/
  get() {
    return this.texVolumeAO;
  }
}