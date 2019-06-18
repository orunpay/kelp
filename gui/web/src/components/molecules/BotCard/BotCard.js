import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Pill from '../../atoms/Pill/Pill';
import RunStatus from '../../atoms/RunStatus/RunStatus';
import chartThumb from '../../../assets/images/chart-thumb.png';
import styles from './BotCard.module.scss';
import PillGroup from '../PillGroup/PillGroup';
import StartStop from '../../atoms/StartStop/StartStop';
import BotExchangeInfo from '../../atoms/BotExchangeInfo/BotExchangeInfo';
import BotAssetsInfo from '../../atoms/BotAssetsInfo/BotAssetsInfo';
import BotBidAskInfo from '../../atoms/BotBidAskInfo/BotBidAskInfo';
import Button from '../../atoms/Button/Button';
import Constants from '../../../Constants';
import PopoverMenu from '../PopoverMenu/PopoverMenu';

import start from '../../../kelp-ops-api/start';
import stop from '../../../kelp-ops-api/stop';
import deleteBot from '../../../kelp-ops-api/deleteBot';
import getState from '../../../kelp-ops-api/getState';
import getBotInfo from '../../../kelp-ops-api/getBotInfo';

let defaultBotInfo = {
  "strategy": "buysell",
  "trading_pair": {
    "Base": "?",
    "Quote": "?"
  },
  "asset_base": {
    "asset_type": "credit_alphanum4",
    "asset_code": "?",
    "asset_issuer": "?"
  },
  "asset_quote": {
    "asset_type": "credit_alphanum4",
    "asset_code": "?",
    "asset_issuer": "?"
  },
  "balance_base": -1,
  "balance_quote": -1,
  "num_bids": -1,
  "num_asks": -1,
  "spread_value": "?",
  "spread_pct": "?",
}

class BotCard extends Component {
  constructor(props) {
    super(props);
    this.state = {
      timeStarted: null,
      timeElapsed: null,
      popoverVisible: false,
      state: Constants.BotState.initializing,
      botInfo: defaultBotInfo,
    };

    this.toggleBot = this.toggleBot.bind(this);
    this.checkState = this.checkState.bind(this);
    this.checkBotInfo = this.checkBotInfo.bind(this);
    this.startBot = this.startBot.bind(this);
    this.stopBot = this.stopBot.bind(this);
    this.tick = this.tick.bind(this);
    this.toggleOptions = this.toggleOptions.bind(this);
    this.callDeleteBot = this.callDeleteBot.bind(this);

    this._asyncRequests = {};
  }

  static defaultProps = {
    name: '',
    test: true,
    warnings: 0,
    errors: 0, 
  }

  static propTypes = {
    name: PropTypes.string,
    test: PropTypes.bool,
    warnings: PropTypes.number,
    errors: PropTypes.number, 
    showDetailsFn: PropTypes.func, 
    baseUrl: PropTypes.string, 
  };

  checkState() {
    if (this._asyncRequests["state"] == null) {
      var _this = this;
      this._asyncRequests["state"] = getState(this.props.baseUrl, this.props.name).then(resp => {
        _this._asyncRequests["state"] = null;
        let state = resp.trim();
        if (_this.state.state !== state) {
          _this.setState({
            state: state,
          });
        }
      });
    }
  }

  checkBotInfo() {
    if (this._asyncRequests["botInfo"] == null) {
      var _this = this;
      this._asyncRequests["botInfo"] = getBotInfo(this.props.baseUrl, this.props.name).then(resp => {
        _this._asyncRequests["botInfo"] = null;
        if (JSON.stringify(resp) !== "{}") {
          _this.setState({
            botInfo: resp,
          });
        } else {
          _this.setState({
            botInfo: defaultBotInfo,
          });
        }
      });
    }
  }

  componentDidMount() {
    this.checkState();
    this.checkBotInfo();
    this._stateTimer = setInterval(this.checkState, 1000);
    this._infoTimer = setInterval(this.checkBotInfo, 5000);
  }

  componentWillUnmount() {
    if (this._stateTimer) {
      clearTimeout(this._stateTimer);
      this._stateTimer = null;
    }

    if (this._infoTimer) {
      clearTimeout(this._infoTimer);
      this._infoTimer = null;
    }

    if (this._tickTimer) {
      clearTimeout(this._tickTimer);
      this._tickTimer = null;
    }

    if (this._asyncRequests["state"]) {
      this._asyncRequests["state"].cancel();
      this._asyncRequests["state"] = null;
    }

    if (this._asyncRequests["start"]) {
      this._asyncRequests["start"].cancel();
      this._asyncRequests["start"] = null;
    }
    
    if (this._asyncRequests["stop"]) {
      this._asyncRequests["stop"].cancel();
      this._asyncRequests["stop"] = null;
    }

    if (this._asyncRequests["delete"]) {
      this._asyncRequests["delete"].cancel();
      this._asyncRequests["delete"] = null;
    }

    if (this._asyncRequests["botInfo"]) {
      this._asyncRequests["botInfo"].cancel();
      this._asyncRequests["botInfo"] = null;
    }
  }

  toggleBot() {
    if (this.state.state === Constants.BotState.running) {
      this.stopBot();
    } else {
      this.startBot();
    }
    this.checkState();
    this.checkBotInfo();
  }

  startBot() {
    var _this = this;
    this._asyncRequests["start"] = start(this.props.baseUrl, this.props.name).then(resp => {
      _this._asyncRequests["start"] = null;

      _this.setState({
        timeStarted: new Date(),
      }, () => {
        _this.checkState();
        _this.checkBotInfo();
        _this.tick();
        _this._tickTimer = setInterval(_this.tick, 1000);
      });
    });
  }

  stopBot() {
    var _this = this;
    this._asyncRequests["stop"] = stop(this.props.baseUrl, this.props.name).then(resp => {
      _this._asyncRequests["stop"] = null;
      _this.setState({
        timeStarted: null,
      });
      clearTimeout(_this._tickTimer);
      _this._tickTimer = null;
    });
  }

  callDeleteBot() {
    var _this = this;
    this._asyncRequests["delete"] = deleteBot(this.props.baseUrl, this.props.name).then(resp => {
      _this._asyncRequests["delete"] = null;
      clearTimeout(_this._tickTimer);
      _this._tickTimer = null;
      // reload parent view
      _this.props.reload();
    });
    
    this.setState({
      popoverVisible: false,
    });
  }

  tick() {
    let timeNow = new Date();
    let diffTime = timeNow - this.state.timeStarted;
    let elapsed = new Date(diffTime);
    this.setState({
      timeElapsed: elapsed,
    });
  }

  toggleOptions() {
    this.setState({
      popoverVisible: !this.state.popoverVisible,
    })
  }

  render() {
    let popover = "";
    if (this.state.popoverVisible) {
      popover = (
        <div>
          <div className={styles.optionsSpacer}/>
          <PopoverMenu
            className={styles.optionsMenu}
            enableEdit={false}
            onEdit={this.toggleOptions}
            enableCopy={false}
            onCopy={this.toggleOptions}
            enableDelete={true}
            onDelete={this.callDeleteBot}
          />
        </div>
      );
    }

    return (
      <div className={styles.card}>
        <span className={this.state.state === Constants.BotState.running ? styles.statusRunning : styles.statusStopped}/>

        <div className={styles.optionsWrapper}>
          <Button
              icon="options"
              size="large"
              variant="transparent"
              hsize="round"
              className={styles.optionsTrigger}
              onClick={this.toggleOptions}
          />
          {popover}
        </div>

        <div className={styles.sortingArrows}>
          <Button
              icon="chevronUp"
              variant="transparent"
              hsize="round"
          />
          <Button
              icon="chevronDown"
              variant="transparent"
              hsize="round"
          />
        </div>

        <div className={styles.firstColumn}>
          <h2 className={styles.title} onClick={this.props.showDetailsFn}>{this.props.name}</h2>
          <div className={styles.botDetailsLine}>
            <BotExchangeInfo strategy={this.state.botInfo.strategy}/>
          </div>
          <div>
            <BotAssetsInfo
              assetBaseCode={this.state.botInfo.trading_pair.Base}
              assetBaseBalance={this.state.botInfo.balance_base}
              assetQuoteCode={this.state.botInfo.trading_pair.Quote}
              assetQuoteBalance={this.state.botInfo.balance_quote}
            />
          </div>
        </div>

        <div className={styles.secondColumn}>
          <div className={styles.notificationsLine}>
            <PillGroup>
              <Pill number={this.props.warnings} type={'warning'}/>
              <Pill number={this.props.errors} type={'error'}/>
            </PillGroup>
          </div>
          <BotBidAskInfo
            spread_value={this.state.botInfo.spread_value}
            spread_pct={this.state.botInfo.spread_pct}
            num_bids={this.state.botInfo.num_bids}
            num_asks={this.state.botInfo.num_asks}
          />
        </div>

        <div className={styles.thirdColumn}>
          <img className={styles.chartThumb} src={chartThumb} alt="chartThumb"/>
        </div>

        <div className={styles.fourthColumn}>
          <RunStatus 
            className={styles.statusDetails}
            state={this.state.state}
            timeRunning={this.state.timeElapsed}
          />
          <StartStop
            onClick={this.toggleBot} 
            state={this.state.state}
          />
        </div>

      </div>
    );
  }
}

export default BotCard;