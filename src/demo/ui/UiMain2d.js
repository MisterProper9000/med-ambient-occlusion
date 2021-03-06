/**
 * @fileOverview UiMain2d
 * @author Epam
 * @version 1.0.0
 */


// ********************************************************
// Imports
// ********************************************************

import React from 'react';
import { connect } from 'react-redux';
import { Row, Col, Container } from 'react-bootstrap';

import UiCtrl2d from './UiCtrl2d';
import Graphics2d from '../engine/Graphics2d';
import UiTools2d from './UiTools2d';
// import UiHistCard from './UiHistCard';

// ********************************************************
// Const
// ********************************************************

// ********************************************************
// Class
// ********************************************************

/**
 * Class UiMain2d some text later...
 */
class UiMain2d extends React.Component {
  transferFuncCallback(transfFuncObj) {
    const i = transfFuncObj.m_indexMoved;
    const x = transfFuncObj.m_handleX[i];
    const y = transfFuncObj.m_handleY[i];
    console.log(`moved point[${i}] = ${x}, ${y}  `);
  }
  /*
   *
   * Main component render func callback
   */
  render() {
    // const store = this.props;
    // const vol = store.volume;
    // const NEED_TANSF_FUNC = false;
    // const funcTra = (NEED_TANSF_FUNC) ? this.transferFuncCallback : undefined;

    const MIN_HEIGHT = 800;
    const strMinHeight = {
      minHeight: MIN_HEIGHT.toString() + 'px'
    };

    const jsxMain2d = 
      <Container fluid="true" style={{ height: '100%', minHeight:'100%' }} >
        <Row>
          <Col xs md lg="4" style={{ height: '100%', position: 'relative' }} >
            <UiCtrl2d />
            <UiTools2d />

            { /*            
            <UiHistCard volume={vol} transfFunc={funcTra} />
            */ }
            
          </Col>
          <Col xs md lg="8" style={strMinHeight} >
            <Graphics2d  />
          </Col>
        </Row>
      </Container>

    return jsxMain2d;
  };
}

export default connect(store => store)(UiMain2d);
