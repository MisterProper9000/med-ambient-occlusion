import math

def arrayShrink(array, xDim, yDim, zDim):
    let shrinked = new Array(Math.floor(array.length / 2))
    for i in range (0, math.floor(xDim / 2.), 2):
      for j in range(0, math.floor(yDim / 2.), 2):
        for k in range(0, math.floor(zDim / 2.), 2):
          shrinked[k * zDim + j * yDim + i] = (array[k * zDim + j * yDim + i]
                                            + array[k * zDim + j * yDim + i + 1]
                                            + array[k * zDim + (j + 1) * yDim + i]
                                            + array[(k + 1) * zDim + j * yDim + i]
                                            + array[k * zDim + (j + 1) * yDim + i + 1]
                                            + array[(k + 1) * zDim + j * yDim + i + 1]
                                            + array[(k + 1) * zDim + (j + 1) * yDim + i]
                                            + array[(k + 1) * zDim + (j + 1) * yDim + i + 1]) / 8;
          console.log(k * zDim + j * yDim + i);
    return shrinked;

