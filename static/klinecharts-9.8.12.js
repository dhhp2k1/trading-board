/*! KLineChart v9.8.12, Apache-2.0. Bundled from upstream tag v9.8.12 (03b2baf1). */
(function (global) {
  "use strict";
  const cache = [];
  const modules = [
function ($exports, $load) {
Object.defineProperty($exports, "DomPosition", { enumerable: true, get: () => DomPosition });
Object.defineProperty($exports, "default", { enumerable: true, get: () => ChartImp });
const $mod0 = $load(26);
const UpdateLevel = $mod0.UpdateLevel;
const $mod2 = $load(23);
const YAxisPosition = $mod2.YAxisPosition;
const $mod4 = $load(4);
const ActionType = $mod4.ActionType;
const $mod6 = $load(3);
const LayoutChildType = $mod6.LayoutChildType;
const $mod8 = $load(5);
const Animation = $mod8.default;
const $mod10 = $load(82);
const createId = $mod10.createId;
const $mod12 = $load(80);
const createDom = $mod12.createDom;
const $mod14 = $load(77);
const getPixelRatio = $mod14.getPixelRatio;
const $mod16 = $load(87);
const isString = $mod16.isString;
const isArray = $mod16.isArray;
const isValid = $mod16.isValid;
const merge = $mod16.merge;
const isNumber = $mod16.isNumber;
const $mod22 = $load(83);
const logWarn = $mod22.logWarn;
const $mod24 = $load(84);
const binarySearchNearest = $mod24.binarySearchNearest;
const $mod26 = $load(16);
const LoadDataType = $mod26.LoadDataType;
const $mod28 = $load(43);
const ChartStore = $mod28.default;
const $mod30 = $load(46);
const SCALE_MULTIPLIER = $mod30.SCALE_MULTIPLIER;
const $mod32 = $load(35);
const CandlePane = $mod32.default;
const $mod34 = $load(37);
const IndicatorPane = $mod34.default;
const $mod36 = $load(41);
const XAxisPane = $mod36.default;
const $mod38 = $load(39);
const SeparatorPane = $mod38.default;
const $mod40 = $load(40);
const PanePosition = $mod40.PanePosition;
const PANE_DEFAULT_HEIGHT = $mod40.PANE_DEFAULT_HEIGHT;
const PaneIdConstants = $mod40.PaneIdConstants;
const $mod44 = $load(111);
const getIndicatorClass = $mod44.getIndicatorClass;
const $mod46 = $load(144);
const getExtensionStyles = $mod46.getStyles;
const $mod48 = $load(1);
const Event = $mod48.default;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */















































const DomPosition = { Root: 'root', Main: 'main', YAxis: 'yAxis' };








































































class ChartImp                  {
  id

          _container
          _chartContainer
                   _chartEvent
                   _chartStore
          _drawPanes             = []
          _candlePane
          _xAxisPane
                   _separatorPanes = new Map                         ()

  constructor (container             , options          ) {
    this._initContainer(container)
    this._chartEvent = new Event(this._chartContainer, this)
    this._chartStore = new ChartStore(this, options)
    this._initPanes(options)
    this.adjustPaneViewport(true, true, true)
  }

          _initContainer (container             )       {
    this._container = container
    this._chartContainer = createDom('div', {
      position: 'relative',
      width: '100%',
      outline: 'none',
      borderStyle: 'none',
      cursor: 'crosshair',
      boxSizing: 'border-box',
      userSelect: 'none',
      webkitUserSelect: 'none',
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      msUserSelect: 'none',
      MozUserSelect: 'none',
      webkitTapHighlightColor: 'transparent'
    })
    this._chartContainer.tabIndex = 1
    container.appendChild(this._chartContainer)
  }

          _initPanes (options          )       {
    const layout = options?.layout ?? [{ type: LayoutChildType.Candle }]
    let candlePaneInitialized = false
    let xAxisPaneInitialized = false

    const createXAxisPane                                = (ops              ) => {
      if (!xAxisPaneInitialized) {
        const pane = this._createPane           (XAxisPane, PaneIdConstants.X_AXIS, ops ?? {})
        this._xAxisPane = pane
        xAxisPaneInitialized = true
      }
    }

    layout.forEach(child => {
      switch (child.type) {
        case LayoutChildType.Candle: {
          if (!candlePaneInitialized) {
            const paneOptions = child.options ?? {}
            merge(paneOptions, { id: PaneIdConstants.CANDLE })
            this._candlePane = this._createPane            (CandlePane, PaneIdConstants.CANDLE, paneOptions)
            const content = child.content ?? []
            content.forEach(v => {
              this.createIndicator(v, true, paneOptions)
            })
            candlePaneInitialized = true
          }
          break
        }
        case LayoutChildType.Indicator: {
          const content = child.content ?? []
          if (content.length > 0) {
            let paneId
            content.forEach(v => {
              if (isValid(paneId)) {
                this.createIndicator(v, true, { id: paneId })
              } else {
                paneId = this.createIndicator(v, true, child.options)
              }
            })
          }
          break
        }
        case LayoutChildType.XAxis: {
          createXAxisPane(child.options)
          break
        }
      }
    })
    createXAxisPane({ position: PanePosition.Bottom })
  }

          _createPane                     (
    DrawPaneClass                                                                                                                                                   ,
    id        ,
    options
  )    {
    let index                   = null
    let pane              = null
    const position = options?.position
    switch (position) {
      case PanePosition.Top: {
        const firstPane = this._drawPanes[0]
        if (isValid(firstPane)) {
          pane = new DrawPaneClass(this._chartContainer, firstPane.getContainer(), this, id, options ?? {})
          index = 0
        }
        break
      }
      case PanePosition.Bottom: { break }
      default: {
        for (let i = this._drawPanes.length - 1; i > -1; i--) {
          const p = this._drawPanes[i]
          const prevP = this._drawPanes[i - 1]
          if (
            p?.getOptions().position === PanePosition.Bottom &&
            prevP?.getOptions().position !== PanePosition.Bottom
          ) {
            pane = new DrawPaneClass(this._chartContainer, p.getContainer(), this, id, options ?? {})
            index = i
            break
          }
        }
      }
    }
    if (!isValid(pane)) {
      pane = new DrawPaneClass(this._chartContainer, null, this, id, options ?? {})
    }
    let newIndex
    if (isNumber(index)) {
      this._drawPanes.splice(index, 0, pane)
      newIndex = index
    } else {
      this._drawPanes.push(pane)
      newIndex = this._drawPanes.length - 1
    }
    if (pane.getId() !== PaneIdConstants.X_AXIS) {
      let nextPane = this._drawPanes[newIndex + 1]
      if (isValid(nextPane)) {
        if (nextPane.getId() === PaneIdConstants.X_AXIS) {
          nextPane = this._drawPanes[newIndex + 2]
        }
      }
      if (isValid(nextPane)) {
        let separatorPane = this._separatorPanes.get(nextPane)
        if (isValid(separatorPane)) {
          separatorPane.setTopPane(pane)
        } else {
          separatorPane = new SeparatorPane(this._chartContainer, nextPane.getContainer(), this, '', pane, nextPane)
          this._separatorPanes.set(nextPane, separatorPane)
        }
      }
      let prevPane = this._drawPanes[newIndex - 1]
      if (isValid(prevPane)) {
        if (prevPane.getId() === PaneIdConstants.X_AXIS) {
          prevPane = this._drawPanes[newIndex - 2]
        }
      }
      if (isValid(prevPane)) {
        const separatorPane = new SeparatorPane(this._chartContainer, pane.getContainer(), this, '', prevPane, pane)
        this._separatorPanes.set(pane, separatorPane)
      }
    }
    return pane
  }

          _measurePaneHeight ()       {
    const totalHeight = Math.floor(this._container.clientHeight)
    const separatorSize = this._chartStore.getStyles().separator.size
    const xAxisHeight = this._xAxisPane.getAxisComponent().getAutoSize()
    let paneExcludeXAxisHeight = totalHeight - xAxisHeight - this._separatorPanes.size * separatorSize
    if (paneExcludeXAxisHeight < 0) {
      paneExcludeXAxisHeight = 0
    }
    let indicatorPaneTotalHeight = 0

    this._drawPanes.forEach(pane => {
      if (pane.getId() !== PaneIdConstants.CANDLE && pane.getId() !== PaneIdConstants.X_AXIS) {
        let paneHeight = pane.getBounding().height
        const paneMinHeight = pane.getOptions().minHeight
        if (paneHeight < paneMinHeight) {
          paneHeight = paneMinHeight
        }
        if (indicatorPaneTotalHeight + paneHeight > paneExcludeXAxisHeight) {
          indicatorPaneTotalHeight = paneExcludeXAxisHeight
          paneHeight = Math.max(paneExcludeXAxisHeight - indicatorPaneTotalHeight, 0)
        } else {
          indicatorPaneTotalHeight += paneHeight
        }
        pane.setBounding({ height: paneHeight })
      }
    })
    const candlePaneHeight = paneExcludeXAxisHeight - indicatorPaneTotalHeight
    this._candlePane?.setBounding({ height: candlePaneHeight })
    this._xAxisPane.setBounding({ height: xAxisHeight })

    let top = 0
    this._drawPanes.forEach(pane => {
      const separatorPane = this._separatorPanes.get(pane)
      if (isValid(separatorPane)) {
        separatorPane.setBounding({ height: separatorSize, top })
        top += separatorSize
      }
      pane.setBounding({ top })
      top += pane.getBounding().height
    })
  }

          _measurePaneWidth ()       {
    const totalWidth = Math.floor(this._container.clientWidth)
    const styles = this._chartStore.getStyles()
    const yAxisStyles = styles.yAxis
    const isYAxisLeft = yAxisStyles.position === YAxisPosition.Left
    const isOutside = !yAxisStyles.inside
    let mainWidth = 0
    let yAxisWidth = 0
    let yAxisLeft = 0
    let mainLeft = 0
    this._drawPanes.forEach(pane => {
      if (pane.getId() !== PaneIdConstants.X_AXIS) {
        yAxisWidth = Math.max(yAxisWidth, pane.getAxisComponent().getAutoSize())
      }
    })
    if (yAxisWidth > totalWidth) {
      yAxisWidth = totalWidth
    }
    if (isOutside) {
      mainWidth = totalWidth - yAxisWidth
      if (isYAxisLeft) {
        yAxisLeft = 0
        mainLeft = yAxisWidth
      } else {
        yAxisLeft = totalWidth - yAxisWidth
        mainLeft = 0
      }
    } else {
      mainWidth = totalWidth
      mainLeft = 0
      if (isYAxisLeft) {
        yAxisLeft = 0
      } else {
        yAxisLeft = totalWidth - yAxisWidth
      }
    }

    this._chartStore.getTimeScaleStore().setTotalBarSpace(mainWidth)

    const paneBounding = { width: totalWidth }
    const mainBounding = { width: mainWidth, left: mainLeft }
    const yAxisBounding = { width: yAxisWidth, left: yAxisLeft }
    const separatorFill = styles.separator.fill
    let separatorBounding
    if (isOutside && !separatorFill) {
      separatorBounding = mainBounding
    } else {
      separatorBounding = paneBounding
    }
    this._drawPanes.forEach((pane) => {
      this._separatorPanes.get(pane)?.setBounding(separatorBounding)
      pane.setBounding(paneBounding, mainBounding, yAxisBounding)
    })
  }

          _setPaneOptions (options             , forceShouldAdjust         )       {
    if (isString(options.id)) {
      const pane = this.getDrawPaneById(options.id)
      let shouldMeasureHeight = false
      if (pane !== null) {
        let shouldAdjust = forceShouldAdjust
        if (options.id !== PaneIdConstants.CANDLE && isNumber(options.height) && options.height > 0) {
          const minHeight = Math.max(options.minHeight ?? pane.getOptions().minHeight, 0)
          const height = Math.max(minHeight, options.height)
          pane.setBounding({ height })
          shouldAdjust = true
          shouldMeasureHeight = true
        }
        if (isString(options.axisOptions?.name) || isValid(options.gap)) {
          shouldAdjust = true
        }
        pane.setOptions(options)
        if (shouldAdjust) {
          this.adjustPaneViewport(shouldMeasureHeight, true, true, true, true)
        }
      }
    }
  }

  getDrawPaneById (paneId        )                           {
    if (paneId === PaneIdConstants.CANDLE) {
      return this._candlePane
    }
    if (paneId === PaneIdConstants.X_AXIS) {
      return this._xAxisPane
    }
    const pane = this._drawPanes.find(p => p.getId() === paneId)
    return pane ?? null
  }

  getContainer ()              { return this._container }

  getChartStore ()             { return this._chartStore }

  getXAxisPane ()            { return this._xAxisPane }

  getAllDrawPanes ()             { return this._drawPanes }

  getAllSeparatorPanes ()                               { return this._separatorPanes }

  adjustPaneViewport (
    shouldMeasureHeight         ,
    shouldMeasureWidth         ,
    shouldUpdate         ,
    shouldAdjustYAxis          ,
    shouldForceAdjustYAxis
  )       {
    if (shouldMeasureHeight) {
      this._measurePaneHeight()
    }
    let forceMeasureWidth = shouldMeasureWidth
    const adjustYAxis = shouldAdjustYAxis ?? false
    const forceAdjustYAxis = shouldForceAdjustYAxis ?? false
    if (adjustYAxis || forceAdjustYAxis) {
      this._drawPanes.forEach(pane => {
        const adjust = pane.getAxisComponent().buildTicks(forceAdjustYAxis)
        if (!forceMeasureWidth) {
          forceMeasureWidth = adjust
        }
      })
    }
    if (forceMeasureWidth) {
      this._measurePaneWidth()
    }
    if (shouldUpdate ?? false) {
      this._xAxisPane.getAxisComponent().buildTicks(true)
      this.updatePane(UpdateLevel.All)
    }
  }

  updatePane (level             , paneId         )       {
    if (isValid(paneId)) {
      const pane = this.getDrawPaneById(paneId)
      pane?.update(level)
    } else {
      this._separatorPanes.forEach(pane => {
        pane.update(level)
      })
      this._drawPanes.forEach(pane => {
        pane.update(level)
      })
    }
  }

  crosshairChange (crosshair           )       {
    const actionStore = this._chartStore.getActionStore()
    if (actionStore.has(ActionType.OnCrosshairChange)) {
      const indicatorData = {}
      this._drawPanes.forEach(pane => {
        const id = pane.getId()
        const paneIndicatorData = {}
        const indicators = this._chartStore.getIndicatorStore().getInstances(id)
        indicators.forEach(indicator => {
          const result = indicator.result
          paneIndicatorData[indicator.name] = result[crosshair.dataIndex ?? result.length - 1]
        })
        indicatorData[id] = paneIndicatorData
      })
      if (isString(crosshair.paneId)) {
        actionStore.execute(ActionType.OnCrosshairChange, {
          ...crosshair,
          indicatorData
        })
      }
    }
  }

  getDom (paneId         , position              )                        {
    if (isString(paneId)) {
      const pane = this.getDrawPaneById(paneId)
      if (pane !== null) {
        const pos = position ?? DomPosition.Root
        switch (pos) {
          case DomPosition.Root: {
            return pane.getContainer()
          }
          case DomPosition.Main: {
            return pane.getMainWidget().getContainer()
          }
          case DomPosition.YAxis: {
            return pane.getYAxisWidget()?.getContainer() ?? null
          }
        }
      }
    } else {
      return this._chartContainer
    }
    return null
  }

  getSize (paneId         , position              )                     {
    if (isValid(paneId)) {
      const pane = this.getDrawPaneById(paneId)
      if (pane !== null) {
        const pos = position ?? DomPosition.Root
        switch (pos) {
          case DomPosition.Root: {
            return pane.getBounding()
          }
          case DomPosition.Main: {
            return pane.getMainWidget().getBounding()
          }
          case DomPosition.YAxis: {
            return pane.getYAxisWidget()?.getBounding() ?? null
          }
        }
      }
    } else {
      return {
        width: Math.floor(this._chartContainer.clientWidth),
        height: Math.floor(this._chartContainer.clientHeight),
        left: 0,
        top: 0,
        right: 0,
        bottom: 0
      }
    }
    return null
  }

  setStyles (styles                              )       {
    this._chartStore.setOptions({ styles })
    let realStyles
    if (isString(styles)) {
      realStyles = getExtensionStyles(styles)
    } else {
      realStyles = styles
    }
    if (isValid(realStyles?.yAxis?.type)) {
      this._candlePane?.getAxisComponent().setAutoCalcTickFlag(true)
    }
    this.adjustPaneViewport(true, true, true, true, true)
  }

  getStyles ()         {
    return this._chartStore.getStyles()
  }

  setLocale (locale        )       {
    this._chartStore.setOptions({ locale })
    this.adjustPaneViewport(true, true, true, true, true)
  }

  getLocale ()         {
    return this._chartStore.getLocale()
  }

  setCustomApi (customApi                    )       {
    this._chartStore.setOptions({ customApi })
    this.adjustPaneViewport(true, true, true, true, true)
  }

  setPriceVolumePrecision (pricePrecision        , volumePrecision        )       {
    this._chartStore.setPrecision({ price: pricePrecision, volume: volumePrecision })
  }

  getPriceVolumePrecision ()            {
    return this._chartStore.getPrecision()
  }

  setTimezone (timezone        )       {
    this._chartStore.setOptions({ timezone })
    this._xAxisPane.getAxisComponent().buildTicks(true)
    this._xAxisPane.update(UpdateLevel.Drawer)
  }

  getTimezone ()         {
    return this._chartStore.getTimeScaleStore().getTimezone()
  }

  setOffsetRightDistance (distance        )       {
    this._chartStore.getTimeScaleStore().setOffsetRightDistance(distance, true)
  }

  getOffsetRightDistance ()         {
    return this._chartStore.getTimeScaleStore().getOffsetRightDistance()
  }

  setMaxOffsetLeftDistance (distance        )       {
    if (distance < 0) {
      logWarn('setMaxOffsetLeftDistance', 'distance', 'distance must greater than zero!!!')
      return
    }
    this._chartStore.getTimeScaleStore().setMaxOffsetLeftDistance(distance)
  }

  setMaxOffsetRightDistance (distance        )       {
    if (distance < 0) {
      logWarn('setMaxOffsetRightDistance', 'distance', 'distance must greater than zero!!!')
      return
    }
    this._chartStore.getTimeScaleStore().setMaxOffsetRightDistance(distance)
  }

  setLeftMinVisibleBarCount (barCount        )       {
    if (barCount < 0) {
      logWarn('setLeftMinVisibleBarCount', 'barCount', 'barCount must greater than zero!!!')
      return
    }
    this._chartStore.getTimeScaleStore().setLeftMinVisibleBarCount(Math.ceil(barCount))
  }

  setRightMinVisibleBarCount (barCount        )       {
    if (barCount < 0) {
      logWarn('setRightMinVisibleBarCount', 'barCount', 'barCount must greater than zero!!!')
      return
    }
    this._chartStore.getTimeScaleStore().setRightMinVisibleBarCount(Math.ceil(barCount))
  }

  setBarSpace (space        )       {
    this._chartStore.getTimeScaleStore().setBarSpace(space)
  }

  getBarSpace ()         {
    return this._chartStore.getTimeScaleStore().getBarSpace().bar
  }

  getVisibleRange ()               {
    return this._chartStore.getTimeScaleStore().getVisibleRange()
  }

  clearData ()       {
    this._chartStore.clear()
  }

  getDataList ()              {
    return this._chartStore.getDataList()
  }

  applyNewData (data             , more          , callback             )       {
    if (isValid(callback)) {
      logWarn('applyNewData', '', 'param `callback` has been deprecated since version 9.8.0, use `subscribeAction(\'onDataReady\')` instead.')
    }
    this._chartStore.addData(data, LoadDataType.Init, more).then(() => {}).catch(() => {}).finally(() => { callback?.() })
  }

  /**
   * @deprecated
   * Since v9.8.0 deprecated, since v10 removed
   */
  applyMoreData (data             , more          , callback             )       {
    logWarn('', '', 'Api `applyMoreData` has been deprecated since version 9.8.0.')
    this._chartStore.addData(data, LoadDataType.Forward, more ?? true).then(() => {}).catch(() => {}).finally(() => { callback?.() })
  }

  updateData (data           , callback             )       {
    if (isValid(callback)) {
      logWarn('updateData', '', 'param `callback` has been deprecated since version 9.8.0, use `subscribeAction(\'onDataReady\')` instead.')
    }
    this._chartStore.addData(data).then(() => {}).catch(() => {}).finally(() => { callback?.() })
  }

  /**
   * @deprecated
   * Since v9.8.0 deprecated, since v10 removed
   */
  loadMore (cb                  )       {
    logWarn('', '', 'Api `loadMore` has been deprecated since version 9.8.0, use `setLoadDataCallback` instead.')
    this._chartStore.setLoadMoreCallback(cb)
  }

  setLoadDataCallback (cb                  )       {
    this._chartStore.setLoadDataCallback(cb)
  }

  createIndicator (value                          , isStack          , paneOptions                        , callback             )                   {
    const indicator = isString(value) ? { name: value } : value
    if (getIndicatorClass(indicator.name) === null) {
      logWarn('createIndicator', 'value', 'indicator not supported, you may need to use registerIndicator to add one!!!')
      return null
    }

    let paneId = paneOptions?.id
    const currentPane = this.getDrawPaneById(paneId ?? '')
    if (currentPane !== null) {
      this._chartStore.getIndicatorStore().addInstance(indicator, paneId ?? '', isStack ?? false).then(_ => {
        this._setPaneOptions(paneOptions ?? {}, currentPane.getAxisComponent().buildTicks(true) ?? false)
      }).catch(_ => {})
    } else {
      paneId ??= createId(PaneIdConstants.INDICATOR)
      const pane = this._createPane(IndicatorPane, paneId, paneOptions ?? {})
      const height = paneOptions?.height ?? PANE_DEFAULT_HEIGHT
      pane.setBounding({ height })
      void this._chartStore.getIndicatorStore().addInstance(indicator, paneId, isStack ?? false).finally(() => {
        this.adjustPaneViewport(true, true, true, true, true)
        callback?.()
      })
    }
    return paneId ?? null
  }

  overrideIndicator (override                 , paneId                   , callback             )       {
    this._chartStore.getIndicatorStore().override(override, paneId ?? null).then(
      ([onlyUpdateFlag, resizeFlag]) => {
        if (onlyUpdateFlag || resizeFlag) {
          this.adjustPaneViewport(false, resizeFlag, true, resizeFlag)
          callback?.()
        }
      }
    ).catch(() => {})
  }

  getIndicatorByPaneId (paneId         , name         )                                                                                               {
    return this._chartStore.getIndicatorStore().getInstanceByPaneId(paneId, name)
  }

  removeIndicator (paneId        , name         )       {
    const indicatorStore = this._chartStore.getIndicatorStore()
    const removed = indicatorStore.removeInstance(paneId, name)
    if (removed) {
      let shouldMeasureHeight = false
      if (paneId !== PaneIdConstants.CANDLE) {
        if (!indicatorStore.hasInstances(paneId)) {
          const pane = this.getDrawPaneById(paneId)
          const index = this._drawPanes.findIndex(p => p.getId() === paneId)
          if (pane !== null) {
            shouldMeasureHeight = true
            const separatorPane = this._separatorPanes.get(pane)
            if (isValid(separatorPane)) {
              const topPane = separatorPane?.getTopPane()
              for (const item of this._separatorPanes) {
                if (item[1].getTopPane().getId() === pane.getId()) {
                  item[1].setTopPane(topPane)
                  break
                }
              }
              separatorPane.destroy()
              this._separatorPanes.delete(pane)
            }
            this._drawPanes.splice(index, 1)
            pane.destroy()

            let firstPane = this._drawPanes[0]
            if (isValid(firstPane)) {
              if (firstPane.getId() === PaneIdConstants.X_AXIS) {
                firstPane = this._drawPanes[1]
              }
            }
            this._separatorPanes.get(firstPane)?.destroy()
            this._separatorPanes.delete(firstPane)
          }
        }
      }
      this.adjustPaneViewport(shouldMeasureHeight, true, true, true, true)
    }
  }

  createOverlay (value                                                        , paneId         )                                             {
    let overlays                  = []
    if (isString(value)) {
      overlays = [{ name: value }]
    } else if (isArray                               (value)) {
      overlays = (value                                 ).map((v                        ) => {
        if (isString(v)) {
          return { name: v }
        }
        return v
      })
    } else {
      const overlay = value
      overlays = [overlay]
    }
    let appointPaneFlag = true
    if (!isValid(paneId) || this.getDrawPaneById(paneId) === null) {
      paneId = PaneIdConstants.CANDLE
      appointPaneFlag = false
    }
    const ids = this._chartStore.getOverlayStore().addInstances(overlays, paneId, appointPaneFlag)
    if (isArray(value)) {
      return ids
    }
    return ids[0]
  }

  getOverlayById (id        )                    {
    return this._chartStore.getOverlayStore().getInstanceById(id)
  }

  overrideOverlay (override                        )       {
    this._chartStore.getOverlayStore().override(override)
  }

  removeOverlay (remove                         )       {
    let overlayRemove
    if (isValid(remove)) {
      if (isString(remove)) {
        overlayRemove = { id: remove }
      } else {
        overlayRemove = remove
      }
    }
    this._chartStore.getOverlayStore().removeInstance(overlayRemove )
  }

  setPaneOptions (options             )       {
    this._setPaneOptions(options, false)
  }

  setZoomEnabled (enabled         )       {
    this._chartStore.getTimeScaleStore().setZoomEnabled(enabled)
  }

  isZoomEnabled ()          {
    return this._chartStore.getTimeScaleStore().getZoomEnabled()
  }

  setScrollEnabled (enabled         )       {
    this._chartStore.getTimeScaleStore().setScrollEnabled(enabled)
  }

  isScrollEnabled ()          {
    return this._chartStore.getTimeScaleStore().getScrollEnabled()
  }

  scrollByDistance (distance        , animationDuration         )       {
    const duration = isNumber(animationDuration) && animationDuration > 0 ? animationDuration : 0
    const timeScaleStore = this._chartStore.getTimeScaleStore()
    timeScaleStore.startScroll()
    if (duration > 0) {
      const animation = new Animation({ duration })
      animation.doFrame(frameTime => {
        const progressDistance = distance * (frameTime / duration)
        timeScaleStore.scroll(progressDistance)
      })
      animation.start()
    } else {
      timeScaleStore.scroll(distance)
    }
  }

  scrollToRealTime (animationDuration         )       {
    const timeScaleStore = this._chartStore.getTimeScaleStore()
    const { bar: barSpace } = timeScaleStore.getBarSpace()
    const difBarCount = timeScaleStore.getLastBarRightSideDiffBarCount() - timeScaleStore.getInitialOffsetRightDistance() / barSpace
    const distance = difBarCount * barSpace
    this.scrollByDistance(distance, animationDuration)
  }

  scrollToDataIndex (dataIndex        , animationDuration         )       {
    const timeScaleStore = this._chartStore.getTimeScaleStore()
    const distance = (
      timeScaleStore.getLastBarRightSideDiffBarCount() + (this.getDataList().length - 1 - dataIndex)
    ) * timeScaleStore.getBarSpace().bar
    this.scrollByDistance(distance, animationDuration)
  }

  scrollToTimestamp (timestamp        , animationDuration         )       {
    const dataIndex = binarySearchNearest(this.getDataList(), 'timestamp', timestamp)
    this.scrollToDataIndex(dataIndex, animationDuration)
  }

  zoomAtCoordinate (scale        , coordinate             , animationDuration         )       {
    const duration = isNumber(animationDuration) && animationDuration > 0 ? animationDuration : 0
    const timeScaleStore = this._chartStore.getTimeScaleStore()
    const { bar: barSpace } = timeScaleStore.getBarSpace()
    const scaleBarSpace = barSpace * scale
    const difSpace = scaleBarSpace - barSpace
    if (duration > 0) {
      let prevProgressBarSpace = 0
      const animation = new Animation({ duration })
      animation.doFrame(frameTime => {
        const progressBarSpace = difSpace * (frameTime / duration)
        const scale = (progressBarSpace - prevProgressBarSpace) / timeScaleStore.getBarSpace().bar * SCALE_MULTIPLIER
        timeScaleStore.zoom(scale, coordinate)
        prevProgressBarSpace = progressBarSpace
      })
      animation.start()
    } else {
      timeScaleStore.zoom(difSpace / barSpace * SCALE_MULTIPLIER, coordinate)
    }
  }

  zoomAtDataIndex (scale        , dataIndex        , animationDuration         )       {
    const x = this._chartStore.getTimeScaleStore().dataIndexToCoordinate(dataIndex)
    this.zoomAtCoordinate(scale, { x, y: 0 }, animationDuration)
  }

  zoomAtTimestamp (scale        , timestamp        , animationDuration         )       {
    const dataIndex = binarySearchNearest(this.getDataList(), 'timestamp', timestamp)
    this.zoomAtDataIndex(scale, dataIndex, animationDuration)
  }

  convertToPixel (points                                        , finder               )                                                   {
    const { paneId = PaneIdConstants.CANDLE, absolute = false } = finder
    let coordinates                             = []
    if (paneId !== PaneIdConstants.X_AXIS) {
      const pane = this.getDrawPaneById(paneId)
      if (pane !== null) {
        const timeScaleStore = this._chartStore.getTimeScaleStore()
        const bounding = pane.getBounding()
        const ps = new Array                ().concat(points)
        const xAxis = this._xAxisPane.getAxisComponent()
        const yAxis = pane.getAxisComponent()
        coordinates = ps.map(point => {
          const coordinate                      = {}
          let dataIndex = point.dataIndex
          if (isNumber(point.timestamp)) {
            dataIndex = timeScaleStore.timestampToDataIndex(point.timestamp)
          }
          if (isNumber(dataIndex)) {
            coordinate.x = xAxis?.convertToPixel(dataIndex)
          }
          if (isNumber(point.value)) {
            const y = yAxis?.convertToPixel(point.value)
            coordinate.y = absolute ? bounding.top + y : y
          }
          return coordinate
        })
      }
    }
    return isArray(points) ? coordinates : (coordinates[0] ?? {})
  }

  convertFromPixel (coordinates                            , finder               )                                         {
    const { paneId = PaneIdConstants.CANDLE, absolute = false } = finder
    let points                        = []
    if (paneId !== PaneIdConstants.X_AXIS) {
      const pane = this.getDrawPaneById(paneId)
      if (pane !== null) {
        const timeScaleStore = this._chartStore.getTimeScaleStore()
        const bounding = pane.getBounding()
        const cs = new Array                     ().concat(coordinates)
        const xAxis = this._xAxisPane.getAxisComponent()
        const yAxis = pane.getAxisComponent()
        points = cs.map(coordinate => {
          const point                 = {}
          if (isNumber(coordinate.x)) {
            const dataIndex = xAxis?.convertFromPixel(coordinate.x) ?? -1
            point.dataIndex = dataIndex
            point.timestamp = timeScaleStore.dataIndexToTimestamp(dataIndex) ?? undefined
          }
          if (isNumber(coordinate.y)) {
            const y = absolute ? coordinate.y - bounding.top : coordinate.y
            point.value = yAxis.convertFromPixel(y)
          }
          return point
        })
      }
    }
    return isArray(coordinates) ? points : (points[0] ?? {})
  }

  executeAction (type            , data     )       {
    switch (type) {
      case ActionType.OnCrosshairChange: {
        const crosshair            = { ...data }
        crosshair.paneId = crosshair.paneId ?? PaneIdConstants.CANDLE
        this._chartStore.getTooltipStore().setCrosshair(crosshair, { notExecuteAction: true })
        break
      }
    }
  }

  subscribeAction (type            , callback                )       {
    this._chartStore.getActionStore().subscribe(type, callback)
  }

  unsubscribeAction (type            , callback                 )       {
    this._chartStore.getActionStore().unsubscribe(type, callback)
  }

  getConvertPictureUrl (includeOverlay          , type         , backgroundColor         )         {
    const width = this._chartContainer.clientWidth
    const height = this._chartContainer.clientHeight
    const canvas = createDom('canvas', {
      width: `${width}px`,
      height: `${height}px`,
      boxSizing: 'border-box'
    })
    const ctx = canvas.getContext('2d')
    const pixelRatio = getPixelRatio(canvas)
    canvas.width = width * pixelRatio
    canvas.height = height * pixelRatio
    ctx.scale(pixelRatio, pixelRatio)

    ctx.fillStyle = backgroundColor ?? '#FFFFFF'
    ctx.fillRect(0, 0, width, height)
    const overlayFlag = includeOverlay ?? false
    this._drawPanes.forEach(pane => {
      const separatorPane = this._separatorPanes.get(pane)
      if (isValid(separatorPane)) {
        const separatorBounding = separatorPane.getBounding()
        ctx.drawImage(
          separatorPane.getImage(overlayFlag),
          separatorBounding.left, separatorBounding.top, separatorBounding.width, separatorBounding.height
        )
      }

      const bounding = pane.getBounding()
      ctx.drawImage(
        pane.getImage(overlayFlag),
        0, bounding.top, width, bounding.height
      )
    })
    return canvas.toDataURL(`image/${type ?? 'jpeg'}`)
  }

  resize ()       {
    this.adjustPaneViewport(true, true, true, true, true)
  }

  destroy ()       {
    this._chartEvent.destroy()
    this._drawPanes.forEach(pane => {
      pane.destroy()
    })
    this._drawPanes = []
    this._separatorPanes.forEach(pane => {
      pane.destroy()
    })
    this._separatorPanes.clear()
    this._container.removeChild(this._chartContainer)
  }
}


},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => Event });
const $mod0 = $load(24);
const SyntheticEvent = $mod0.default;
const TOUCH_MIN_RADIUS = $mod0.TOUCH_MIN_RADIUS;
const $mod3 = $load(26);
const UpdateLevel = $mod3.UpdateLevel;
const $mod5 = $load(79);
const requestAnimationFrame = $mod5.requestAnimationFrame;
const cancelAnimationFrame = $mod5.cancelAnimationFrame;
const $mod8 = $load(40);
const PaneIdConstants = $mod8.PaneIdConstants;
const $mod10 = $load(73);
const WidgetNameConstants = $mod10.WidgetNameConstants;
const REAL_SEPARATOR_HEIGHT = $mod10.REAL_SEPARATOR_HEIGHT;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
























class Event                         {
                   _container
                   _chart
                   _event

  // 惯性滚动开始时间
          _flingStartTime = new Date().getTime()
  // 惯性滚动定时器
          _flingScrollRequestId                   = null
  // 开始滚动时坐标点
          _startScrollCoordinate                       = null
  // 开始触摸时坐标
          _touchCoordinate                       = null
  // 是否是取消了十字光标
          _touchCancelCrosshair = false
  // 是否缩放过
          _touchZoomed = false
  // 用来记录捏合缩放的尺寸
          _pinchScale = 1

          _mouseDownWidget                   = null

          _prevYAxisRange                      = null

          _xAxisStartScaleCoordinate                       = null
          _xAxisStartScaleDistance = 0
          _xAxisScale = 1

          _yAxisStartScaleDistance = 0

          _mouseMoveTriggerWidgetInfo                         = { pane: null, widget: null }

                   _boundKeyBoardDownEvent                                   = (event               ) => {
    if (event.shiftKey) {
      switch (event.code) {
        case 'Equal': {
          this._chart.getChartStore().getTimeScaleStore().zoom(0.5)
          break
        }
        case 'Minus': {
          this._chart.getChartStore().getTimeScaleStore().zoom(-0.5)
          break
        }
        case 'ArrowLeft': {
          const timeScaleStore = this._chart.getChartStore().getTimeScaleStore()
          timeScaleStore.startScroll()
          timeScaleStore.scroll(-3 * timeScaleStore.getBarSpace().bar)
          break
        }
        case 'ArrowRight': {
          const timeScaleStore = this._chart.getChartStore().getTimeScaleStore()
          timeScaleStore.startScroll()
          timeScaleStore.scroll(3 * timeScaleStore.getBarSpace().bar)
          break
        }
        default: {
          break
        }
      }
    }
  }

  constructor (container             , chart       ) {
    this._container = container
    this._chart = chart
    this._event = new SyntheticEvent(container, this, {
      treatVertDragAsPageScroll: () => false,
      treatHorzDragAsPageScroll: () => false
    })
    container.addEventListener('keydown', this._boundKeyBoardDownEvent)
  }

  pinchStartEvent ()          {
    this._touchZoomed = true
    this._pinchScale = 1
    return true
  }

  pinchEvent (e                 , scale        )          {
    const { pane, widget } = this._findWidgetByEvent(e)
    if (pane?.getId() !== PaneIdConstants.X_AXIS && widget?.getName() === WidgetNameConstants.MAIN) {
      const event = this._makeWidgetEvent(e, widget)
      const zoomScale = (scale - this._pinchScale) * 5
      this._pinchScale = scale
      this._chart.getChartStore().getTimeScaleStore().zoom(zoomScale, { x: event.x, y: event.y })
      return true
    }
    return false
  }

  mouseWheelHortEvent (_                 , distance        )          {
    const timeScaleStore = this._chart.getChartStore().getTimeScaleStore()
    timeScaleStore.startScroll()
    timeScaleStore.scroll(distance)
    return true
  }

  mouseWheelVertEvent (e                 , scale        )          {
    const { widget } = this._findWidgetByEvent(e)
    const event = this._makeWidgetEvent(e, widget)
    const name = widget?.getName()
    if (name === WidgetNameConstants.MAIN) {
      this._chart.getChartStore().getTimeScaleStore().zoom(scale, { x: event.x, y: event.y })
      return true
    }
    return false
  }

  mouseDownEvent (e                 )          {
    const { pane, widget } = this._findWidgetByEvent(e)
    this._mouseDownWidget = widget
    if (widget !== null) {
      const event = this._makeWidgetEvent(e, widget)
      const name = widget.getName()
      switch (name) {
        case WidgetNameConstants.SEPARATOR: {
          return widget.dispatchEvent('mouseDownEvent', event)
        }
        case WidgetNameConstants.MAIN: {
          const range = (pane                   ).getAxisComponent().getRange() ?? null
          this._prevYAxisRange = range === null ? range : { ...range }
          this._startScrollCoordinate = { x: event.x, y: event.y }
          this._chart.getChartStore().getTimeScaleStore().startScroll()
          return widget.dispatchEvent('mouseDownEvent', event)
        }
        case WidgetNameConstants.X_AXIS: {
          const consumed = widget.dispatchEvent('mouseDownEvent', event)
          if (consumed) {
            this._chart.updatePane(UpdateLevel.Overlay)
          }
          this._xAxisStartScaleCoordinate = { x: event.x, y: event.y }
          this._xAxisStartScaleDistance = event.pageX
          return consumed
        }
        case WidgetNameConstants.Y_AXIS: {
          const consumed = widget.dispatchEvent('mouseDownEvent', event)
          if (consumed) {
            this._chart.updatePane(UpdateLevel.Overlay)
          }
          const range = (pane                   ).getAxisComponent().getRange() ?? null
          this._prevYAxisRange = range === null ? range : { ...range }
          this._yAxisStartScaleDistance = event.pageY
          return consumed
        }
      }
    }
    return false
  }

  mouseMoveEvent (e                 )          {
    const { pane, widget } = this._findWidgetByEvent(e)
    const event = this._makeWidgetEvent(e, widget)
    if (
      this._mouseMoveTriggerWidgetInfo.pane?.getId() !== pane?.getId() ||
      this._mouseMoveTriggerWidgetInfo.widget?.getName() !== widget?.getName()
    ) {
      widget?.dispatchEvent('mouseEnterEvent', event)
      this._mouseMoveTriggerWidgetInfo.widget?.dispatchEvent('mouseLeaveEvent', event)
      this._mouseMoveTriggerWidgetInfo = { pane, widget }
    }
    if (widget !== null) {
      const name = widget.getName()
      switch (name) {
        case WidgetNameConstants.MAIN: {
          const consumed = widget.dispatchEvent('mouseMoveEvent', event)
          const chartStore = this._chart.getChartStore()
          let crosshair                        = { x: event.x, y: event.y, paneId: pane?.getId() }
          if (consumed && chartStore.getTooltipStore().getActiveIcon() !== null) {
            crosshair = undefined
            if (widget !== null) {
              widget.getContainer().style.cursor = 'pointer'
            }
          }
          this._chart.getChartStore().getTooltipStore().setCrosshair(crosshair)
          return consumed
        }
        case WidgetNameConstants.SEPARATOR:
        case WidgetNameConstants.X_AXIS:
        case WidgetNameConstants.Y_AXIS: {
          const consumed = widget.dispatchEvent('mouseMoveEvent', event)
          this._chart.getChartStore().getTooltipStore().setCrosshair()
          return consumed
        }
      }
    }
    return false
  }

  pressedMouseMoveEvent (e                 )          {
    if (this._mouseDownWidget !== null && this._mouseDownWidget.getName() === WidgetNameConstants.SEPARATOR) {
      return this._mouseDownWidget.dispatchEvent('pressedMouseMoveEvent', e)
    }
    const { pane, widget } = this._findWidgetByEvent(e)
    if (
      widget !== null &&
      this._mouseDownWidget?.getPane().getId() === pane?.getId() &&
      this._mouseDownWidget?.getName() === widget.getName()
    ) {
      const event = this._makeWidgetEvent(e, widget)
      const name = widget.getName()
      switch (name) {
        case WidgetNameConstants.MAIN: {
          const bounding = widget.getBounding()
          const consumed = widget.dispatchEvent('pressedMouseMoveEvent', event)
          if (!consumed && this._startScrollCoordinate !== null) {
            const yAxis = (pane                   ).getAxisComponent()
            if (this._prevYAxisRange !== null && !yAxis.getAutoCalcTickFlag() && yAxis.getScrollZoomEnabled()) {
              const { from, to, range } = this._prevYAxisRange
              let distance
              if (yAxis?.isReverse() ?? false) {
                distance = this._startScrollCoordinate.y - event.y
              } else {
                distance = event.y - this._startScrollCoordinate.y
              }
              const scale = distance / bounding.height
              const difRange = range * scale
              const newFrom = from + difRange
              const newTo = to + difRange
              const newRealFrom = yAxis.convertToRealValue(newFrom)
              const newRealTo = yAxis.convertToRealValue(newTo)
              yAxis.setRange({
                from: newFrom,
                to: newTo,
                range: newTo - newFrom,
                realFrom: newRealFrom,
                realTo: newRealTo,
                realRange: newRealTo - newRealFrom
              })
            }
            const distance = event.x - this._startScrollCoordinate.x
            this._chart.getChartStore().getTimeScaleStore().scroll(distance)
          }
          this._chart.getChartStore().getTooltipStore().setCrosshair({ x: event.x, y: event.y, paneId: pane?.getId() })
          return consumed
        }
        case WidgetNameConstants.X_AXIS: {
          const consumed = widget.dispatchEvent('pressedMouseMoveEvent', event)
          if (!consumed) {
            const xAxis = (pane                   ).getAxisComponent()
            if ((xAxis?.getScrollZoomEnabled() ?? true)) {
              const scale = this._xAxisStartScaleDistance / event.pageX
              if (Number.isFinite(scale)) {
                const zoomScale = (scale - this._xAxisScale) * 10
                this._xAxisScale = scale
                this._chart.getChartStore().getTimeScaleStore().zoom(zoomScale, this._xAxisStartScaleCoordinate ?? undefined)
              }
            }
          } else {
            this._chart.updatePane(UpdateLevel.Overlay)
          }
          return consumed
        }
        case WidgetNameConstants.Y_AXIS: {
          const consumed = widget.dispatchEvent('pressedMouseMoveEvent', event)
          if (!consumed) {
            const yAxis = (pane                   ).getAxisComponent()
            if (this._prevYAxisRange !== null && yAxis.getScrollZoomEnabled()) {
              const { from, to, range } = this._prevYAxisRange
              const scale = event.pageY / this._yAxisStartScaleDistance
              const newRange = range * scale
              const difRange = (newRange - range) / 2
              const newFrom = from - difRange
              const newTo = to + difRange
              const newRealFrom = yAxis.convertToRealValue(newFrom)
              const newRealTo = yAxis.convertToRealValue(newTo)
              yAxis.setRange({
                from: newFrom,
                to: newTo,
                range: newRange,
                realFrom: newRealFrom,
                realTo: newRealTo,
                realRange: newRealTo - newRealFrom
              })
              this._chart.adjustPaneViewport(false, true, true, true)
            }
          } else {
            this._chart.updatePane(UpdateLevel.Overlay)
          }
          return consumed
        }
      }
    }
    return false
  }

  mouseUpEvent (e                 )          {
    const { widget } = this._findWidgetByEvent(e)
    let consumed          = false
    if (widget !== null) {
      const event = this._makeWidgetEvent(e, widget)
      const name = widget.getName()
      switch (name) {
        case WidgetNameConstants.MAIN:
        case WidgetNameConstants.SEPARATOR:
        case WidgetNameConstants.X_AXIS:
        case WidgetNameConstants.Y_AXIS: {
          consumed = widget.dispatchEvent('mouseUpEvent', event)
          break
        }
      }
      if (consumed) {
        this._chart.updatePane(UpdateLevel.Overlay)
      }
    }
    this._mouseDownWidget = null
    this._startScrollCoordinate = null
    this._prevYAxisRange = null
    this._xAxisStartScaleCoordinate = null
    this._xAxisStartScaleDistance = 0
    this._xAxisScale = 1
    this._yAxisStartScaleDistance = 0
    return consumed
  }

  mouseClickEvent (e                 )          {
    const { widget } = this._findWidgetByEvent(e)
    if (widget !== null) {
      const event = this._makeWidgetEvent(e, widget)
      return widget.dispatchEvent('mouseClickEvent', event)
    }
    return false
  }

  mouseRightClickEvent (e                 )          {
    const { widget } = this._findWidgetByEvent(e)
    let consumed          = false
    if (widget !== null) {
      const event = this._makeWidgetEvent(e, widget)
      const name = widget.getName()
      switch (name) {
        case WidgetNameConstants.MAIN:
        case WidgetNameConstants.X_AXIS:
        case WidgetNameConstants.Y_AXIS: {
          consumed = widget.dispatchEvent('mouseRightClickEvent', event)
          break
        }
      }
      if (consumed) {
        this._chart.updatePane(UpdateLevel.Overlay)
      }
    }
    return false
  }

  mouseDoubleClickEvent (e                 )          {
    const { pane, widget } = this._findWidgetByEvent(e)
    if (widget !== null) {
      const name = widget.getName()
      switch (name) {
        case WidgetNameConstants.MAIN: {
          const event = this._makeWidgetEvent(e, widget)
          return widget.dispatchEvent('mouseDoubleClickEvent', event)
        }
        case WidgetNameConstants.Y_AXIS: {
          const yAxis = (pane                   ).getAxisComponent()
          if (!yAxis.getAutoCalcTickFlag()) {
            yAxis.setAutoCalcTickFlag(true)
            this._chart.adjustPaneViewport(false, true, true, true)
            return true
          }
          break
        }
      }
    }
    return false
  }

  mouseLeaveEvent ()          {
    this._chart.getChartStore().getTooltipStore().setCrosshair()
    return true
  }

  touchStartEvent (e                 )          {
    const { pane, widget } = this._findWidgetByEvent(e)
    if (widget !== null) {
      const event = this._makeWidgetEvent(e, widget)
      const name = widget.getName()
      switch (name) {
        case WidgetNameConstants.MAIN: {
          const chartStore = this._chart.getChartStore()
          const tooltipStore = chartStore.getTooltipStore()
          if (widget.dispatchEvent('mouseDownEvent', event)) {
            this._touchCancelCrosshair = true
            this._touchCoordinate = null
            tooltipStore.setCrosshair(undefined, { notInvalidate: true })
            this._chart.updatePane(UpdateLevel.Overlay)
            return true
          }
          if (this._flingScrollRequestId !== null) {
            cancelAnimationFrame(this._flingScrollRequestId)
            this._flingScrollRequestId = null
          }
          this._flingStartTime = new Date().getTime()
          this._startScrollCoordinate = { x: event.x, y: event.y }
          chartStore.getTimeScaleStore().startScroll()
          this._touchZoomed = false
          if (this._touchCoordinate !== null) {
            const xDif = event.x - this._touchCoordinate.x
            const yDif = event.y - this._touchCoordinate.y
            const radius = Math.sqrt(xDif * xDif + yDif * yDif)
            if (radius < TOUCH_MIN_RADIUS) {
              this._touchCoordinate = { x: event.x, y: event.y }
              tooltipStore.setCrosshair({ x: event.x, y: event.y, paneId: pane?.getId() })
            } else {
              this._touchCoordinate = null
              this._touchCancelCrosshair = true
              tooltipStore.setCrosshair()
            }
          }
          return true
        }
        case WidgetNameConstants.X_AXIS:
        case WidgetNameConstants.Y_AXIS: {
          const consumed = widget.dispatchEvent('mouseDownEvent', event)
          if (consumed) {
            this._chart.updatePane(UpdateLevel.Overlay)
          }
          return consumed
        }
      }
    }
    return false
  }

  touchMoveEvent (e                 )          {
    const { pane, widget } = this._findWidgetByEvent(e)
    if (widget !== null) {
      const event = this._makeWidgetEvent(e, widget)
      const name = widget.getName()
      const chartStore = this._chart.getChartStore()
      const tooltipStore = chartStore.getTooltipStore()
      switch (name) {
        case WidgetNameConstants.MAIN: {
          if (widget.dispatchEvent('pressedMouseMoveEvent', event)) {
            event.preventDefault?.()
            tooltipStore.setCrosshair(undefined, { notInvalidate: true })
            this._chart.updatePane(UpdateLevel.Overlay)
            return true
          }
          if (this._touchCoordinate !== null) {
            event.preventDefault?.()
            tooltipStore.setCrosshair({ x: event.x, y: event.y, paneId: pane?.getId() })
          } else {
            if (
              this._startScrollCoordinate !== null &&
              Math.abs(this._startScrollCoordinate.x - event.x) > this._startScrollCoordinate.y - event.y
            ) {
              const distance = event.x - this._startScrollCoordinate.x
              chartStore.getTimeScaleStore().scroll(distance)
            }
          }
          return true
        }
        case WidgetNameConstants.X_AXIS:
        case WidgetNameConstants.Y_AXIS: {
          const consumed = widget.dispatchEvent('pressedMouseMoveEvent', event)
          if (consumed) {
            event.preventDefault?.()
            this._chart.updatePane(UpdateLevel.Overlay)
          }
          return consumed
        }
      }
    }
    return false
  }

  touchEndEvent (e                 )          {
    const { widget } = this._findWidgetByEvent(e)
    if (widget !== null) {
      const event = this._makeWidgetEvent(e, widget)
      const name = widget.getName()
      switch (name) {
        case WidgetNameConstants.MAIN: {
          widget.dispatchEvent('mouseUpEvent', event)
          if (this._startScrollCoordinate !== null) {
            const time = new Date().getTime() - this._flingStartTime
            const distance = event.x - this._startScrollCoordinate.x
            let v = distance / (time > 0 ? time : 1) * 20
            if (time < 200 && Math.abs(v) > 0) {
              const timeScaleStore = this._chart.getChartStore().getTimeScaleStore()
              const flingScroll               = () => {
                this._flingScrollRequestId = requestAnimationFrame(() => {
                  timeScaleStore.startScroll()
                  timeScaleStore.scroll(v)
                  v = v * (1 - 0.025)
                  if (Math.abs(v) < 1) {
                    if (this._flingScrollRequestId !== null) {
                      cancelAnimationFrame(this._flingScrollRequestId)
                      this._flingScrollRequestId = null
                    }
                  } else {
                    flingScroll()
                  }
                })
              }
              flingScroll()
            }
          }
          return true
        }
        case WidgetNameConstants.X_AXIS:
        case WidgetNameConstants.Y_AXIS: {
          const consumed = widget.dispatchEvent('mouseUpEvent', event)
          if (consumed) {
            this._chart.updatePane(UpdateLevel.Overlay)
          }
        }
      }
    }
    return false
  }

  tapEvent (e                 )          {
    const { pane, widget } = this._findWidgetByEvent(e)
    let consumed = false
    if (widget !== null) {
      const event = this._makeWidgetEvent(e, widget)
      const result = widget.dispatchEvent('mouseClickEvent', event)
      if (widget.getName() === WidgetNameConstants.MAIN) {
        const event = this._makeWidgetEvent(e, widget)
        const chartStore = this._chart.getChartStore()
        const tooltipStore = chartStore.getTooltipStore()
        if (result) {
          this._touchCancelCrosshair = true
          this._touchCoordinate = null
          tooltipStore.setCrosshair(undefined, { notInvalidate: true })
          consumed = true
        } else {
          if (!this._touchCancelCrosshair && !this._touchZoomed) {
            this._touchCoordinate = { x: event.x, y: event.y }
            tooltipStore.setCrosshair({ x: event.x, y: event.y, paneId: pane?.getId() }, { notInvalidate: true })
            consumed = true
          }
          this._touchCancelCrosshair = false
        }
      }
      if (consumed || result) {
        this._chart.updatePane(UpdateLevel.Overlay)
      }
    }
    return consumed
  }

  doubleTapEvent (e                 )          {
    return this.mouseDoubleClickEvent(e)
  }

  longTapEvent (e                 )          {
    const { pane, widget } = this._findWidgetByEvent(e)
    if (widget !== null && widget.getName() === WidgetNameConstants.MAIN) {
      const event = this._makeWidgetEvent(e, widget)
      this._touchCoordinate = { x: event.x, y: event.y }
      this._chart.getChartStore().getTooltipStore().setCrosshair({ x: event.x, y: event.y, paneId: pane?.getId() })
      return true
    }
    return false
  }

          _findWidgetByEvent (event                 )                         {
    const { x, y } = event
    const separatorPanes = this._chart.getAllSeparatorPanes()
    const separatorSize = this._chart.getChartStore().getStyles().separator.size
    for (const [, pane] of separatorPanes) {
      const bounding = pane.getBounding()
      const top = bounding.top - Math.round((REAL_SEPARATOR_HEIGHT - separatorSize) / 2)
      if (
        x >= bounding.left && x <= bounding.left + bounding.width &&
        y >= top && y <= top + REAL_SEPARATOR_HEIGHT
      ) {
        return { pane, widget: pane.getWidget() }
      }
    }

    const drawPanes = this._chart.getAllDrawPanes()

    let pane                     = null
    for (const p of drawPanes) {
      const bounding = p.getBounding()
      if (
        x >= bounding.left && x <= bounding.left + bounding.width &&
        y >= bounding.top && y <= bounding.top + bounding.height
      ) {
        pane = p
        break
      }
    }
    let widget                   = null
    if (pane !== null) {
      if (widget === null) {
        const mainWidget = pane.getMainWidget()
        const mainBounding = mainWidget.getBounding()
        if (
          x >= mainBounding.left && x <= mainBounding.left + mainBounding.width &&
          y >= mainBounding.top && y <= mainBounding.top + mainBounding.height
        ) {
          widget = mainWidget
        }
      }
      if (widget === null) {
        const yAxisWidget = pane.getYAxisWidget()
        if (yAxisWidget !== null) {
          const yAxisBounding = yAxisWidget.getBounding()
          if (
            x >= yAxisBounding.left && x <= yAxisBounding.left + yAxisBounding.width &&
            y >= yAxisBounding.top && y <= yAxisBounding.top + yAxisBounding.height
          ) {
            widget = yAxisWidget
          }
        }
      }
    }
    return { pane, widget }
  }

          _makeWidgetEvent (event                 , widget                  )                  {
    const bounding = widget?.getBounding() ?? null
    return {
      ...event,
      x: event.x - (bounding?.left ?? 0),
      y: event.y - (bounding?.top ?? 0)
    }
  }

  destroy ()       {
    this._container.removeEventListener('keydown', this._boundKeyBoardDownEvent)
    this._event.destroy()
  }
}


},
function ($exports, $load) {
Object.defineProperty($exports, "version", { enumerable: true, get: () => version });
Object.defineProperty($exports, "init", { enumerable: true, get: () => init });
Object.defineProperty($exports, "dispose", { enumerable: true, get: () => dispose });
Object.defineProperty($exports, "registerFigure", { enumerable: true, get: () => registerFigure });
Object.defineProperty($exports, "getSupportedFigures", { enumerable: true, get: () => getSupportedFigures });
Object.defineProperty($exports, "getFigureClass", { enumerable: true, get: () => getFigureClass });
Object.defineProperty($exports, "registerIndicator", { enumerable: true, get: () => registerIndicator });
Object.defineProperty($exports, "getSupportedIndicators", { enumerable: true, get: () => getSupportedIndicators });
Object.defineProperty($exports, "registerOverlay", { enumerable: true, get: () => registerOverlay });
Object.defineProperty($exports, "getSupportedOverlays", { enumerable: true, get: () => getSupportedOverlays });
Object.defineProperty($exports, "getOverlayClass", { enumerable: true, get: () => getOverlayClass });
Object.defineProperty($exports, "registerLocale", { enumerable: true, get: () => registerLocale });
Object.defineProperty($exports, "getSupportedLocales", { enumerable: true, get: () => getSupportedLocales });
Object.defineProperty($exports, "registerStyles", { enumerable: true, get: () => registerStyles });
Object.defineProperty($exports, "registerXAxis", { enumerable: true, get: () => registerXAxis });
Object.defineProperty($exports, "registerYAxis", { enumerable: true, get: () => registerYAxis });
Object.defineProperty($exports, "utils", { enumerable: true, get: () => utils });
Object.defineProperty($exports, "LineType", { enumerable: true, get: () => LineType });
Object.defineProperty($exports, "PolygonType", { enumerable: true, get: () => PolygonType });
Object.defineProperty($exports, "TooltipShowRule", { enumerable: true, get: () => TooltipShowRule });
Object.defineProperty($exports, "TooltipShowType", { enumerable: true, get: () => TooltipShowType });
Object.defineProperty($exports, "TooltipIconPosition", { enumerable: true, get: () => TooltipIconPosition });
Object.defineProperty($exports, "CandleTooltipRectPosition", { enumerable: true, get: () => CandleTooltipRectPosition });
Object.defineProperty($exports, "CandleType", { enumerable: true, get: () => CandleType });
Object.defineProperty($exports, "YAxisPosition", { enumerable: true, get: () => YAxisPosition });
Object.defineProperty($exports, "YAxisType", { enumerable: true, get: () => YAxisType });
Object.defineProperty($exports, "FormatDateType", { enumerable: true, get: () => FormatDateType });
Object.defineProperty($exports, "DomPosition", { enumerable: true, get: () => DomPosition });
Object.defineProperty($exports, "ActionType", { enumerable: true, get: () => ActionType });
Object.defineProperty($exports, "IndicatorSeries", { enumerable: true, get: () => IndicatorSeries });
Object.defineProperty($exports, "OverlayMode", { enumerable: true, get: () => OverlayMode });
Object.defineProperty($exports, "LoadDataType", { enumerable: true, get: () => LoadDataType });
const $mod0 = $load(23);
const LineType = $mod0.LineType;
const PolygonType = $mod0.PolygonType;
const TooltipShowRule = $mod0.TooltipShowRule;
const TooltipShowType = $mod0.TooltipShowType;
const TooltipIconPosition = $mod0.TooltipIconPosition;
const CandleType = $mod0.CandleType;
const YAxisPosition = $mod0.YAxisPosition;
const YAxisType = $mod0.YAxisType;
const CandleTooltipRectPosition = $mod0.CandleTooltipRectPosition;
const $mod10 = $load(83);
const logError = $mod10.logError;
const logTag = $mod10.logTag;
const logWarn = $mod10.logWarn;
const $mod14 = $load(87);
const clone = $mod14.clone;
const merge = $mod14.merge;
const isString = $mod14.isString;
const isNumber = $mod14.isNumber;
const isValid = $mod14.isValid;
const isObject = $mod14.isObject;
const isArray = $mod14.isArray;
const isFunction = $mod14.isFunction;
const isBoolean = $mod14.isBoolean;
const $mod24 = $load(81);
const formatValue = $mod24.formatValue;
const formatPrecision = $mod24.formatPrecision;
const formatBigNumber = $mod24.formatBigNumber;
const formatDate = $mod24.formatDate;
const formatThousands = $mod24.formatThousands;
const formatFoldDecimal = $mod24.formatFoldDecimal;
const $mod31 = $load(77);
const calcTextWidth = $mod31.calcTextWidth;
const $mod33 = $load(4);
const ActionType = $mod33.ActionType;
const $mod35 = $load(16);
const LoadDataType = $mod35.LoadDataType;
const $mod37 = $load(31);
const IndicatorSeries = $mod37.IndicatorSeries;
const $mod39 = $load(32);
const OverlayMode = $mod39.OverlayMode;
const $mod41 = $load(3);
const FormatDateType = $mod41.FormatDateType;
const $mod43 = $load(0);
const ChartImp = $mod43.default;
const DomPosition = $mod43.DomPosition;
const $mod46 = $load(88);
const checkCoordinateOnArc = $mod46.checkCoordinateOnArc;
const drawArc = $mod46.drawArc;
const $mod49 = $load(89);
const checkCoordinateOnCircle = $mod49.checkCoordinateOnCircle;
const drawCircle = $mod49.drawCircle;
const $mod52 = $load(91);
const checkCoordinateOnLine = $mod52.checkCoordinateOnLine;
const drawLine = $mod52.drawLine;
const getLinearYFromSlopeIntercept = $mod52.getLinearYFromSlopeIntercept;
const getLinearSlopeIntercept = $mod52.getLinearSlopeIntercept;
const getLinearYFromCoordinates = $mod52.getLinearYFromCoordinates;
const $mod58 = $load(92);
const checkCoordinateOnPolygon = $mod58.checkCoordinateOnPolygon;
const drawPolygon = $mod58.drawPolygon;
const $mod61 = $load(93);
const checkCoordinateOnRect = $mod61.checkCoordinateOnRect;
const drawRect = $mod61.drawRect;
const $mod64 = $load(94);
const drawRectText = $mod64.drawRectText;
const $mod66 = $load(95);
const checkCoordinateOnText = $mod66.checkCoordinateOnText;
const drawText = $mod66.drawText;
const $mod69 = $load(90);
const registerFigure = $mod69.registerFigure;
const getSupportedFigures = $mod69.getSupportedFigures;
const getFigureClass = $mod69.getFigureClass;
const $mod73 = $load(111);
const registerIndicator = $mod73.registerIndicator;
const getSupportedIndicators = $mod73.getSupportedIndicators;
const $mod76 = $load(97);
const registerLocale = $mod76.registerLocale;
const getSupportedLocales = $mod76.getSupportedLocales;
const $mod79 = $load(131);
const registerOverlay = $mod79.registerOverlay;
const getOverlayClass = $mod79.getOverlayClass;
const getSupportedOverlays = $mod79.getSupportedOverlays;
const $mod83 = $load(144);
const registerStyles = $mod83.registerStyles;
const $mod85 = $load(147);
const registerXAxis = $mod85.registerXAxis;
const $mod87 = $load(149);
const registerYAxis = $mod87.registerYAxis;
/**
 *       ___           ___                   ___           ___           ___           ___           ___           ___           ___
 *      /\__\         /\__\      ___        /\__\         /\  \         /\  \         /\__\         /\  \         /\  \         /\  \
 *     /:/  /        /:/  /     /\  \      /::|  |       /::\  \       /::\  \       /:/  /        /::\  \       /::\  \        \:\  \
 *    /:/__/        /:/  /      \:\  \    /:|:|  |      /:/\:\  \     /:/\:\  \     /:/__/        /:/\:\  \     /:/\:\  \        \:\  \
 *   /::\__\____   /:/  /       /::\__\  /:/|:|  |__   /::\~\:\  \   /:/  \:\  \   /::\  \ ___   /::\~\:\  \   /::\~\:\  \       /::\  \
 *  /:/\:::::\__\ /:/__/     __/:/\/__/ /:/ |:| /\__\ /:/\:\ \:\__\ /:/__/ \:\__\ /:/\:\  /\__\ /:/\:\ \:\__\ /:/\:\ \:\__\     /:/\:\__\
 *  \/_|:|~~|~    \:\  \    /\/:/  /    \/__|:|/:/  / \:\~\:\ \/__/ \:\  \  \/__/ \/__\:\/:/  / \/__\:\/:/  / \/_|::\/:/  /    /:/  \/__/
 *     |:|  |      \:\  \   \::/__/         |:/:/  /   \:\ \:\__\    \:\  \            \::/  /       \::/  /     |:|::/  /    /:/  /
 *     |:|  |       \:\  \   \:\__\         |::/  /     \:\ \/__/     \:\  \           /:/  /        /:/  /      |:|\/__/     \/__/
 *     |:|  |        \:\__\   \/__/         /:/  /       \:\__\        \:\__\         /:/  /        /:/  /       |:|  |
 *      \|__|         \/__/                 \/__/         \/__/         \/__/         \/__/         \/__/         \|__|
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


































const instances = new Map                  ()
let chartBaseId = 1

/**
 * Chart version
 * @return {string}
 */
function version ()         {
  return '9.8.12'
}

/**
 * Init chart instance
 * @param ds
 * @param options
 * @returns {Chart}
 */
function init (ds                      , options          )                  {
  logTag()
  let dom
  if (isString(ds)) {
    dom = document.getElementById(ds)
  } else {
    dom = ds
  }
  if (dom === null) {
    logError('', '', 'The chart cannot be initialized correctly. Please check the parameters. The chart container cannot be null and child elements need to be added!!!')
    return null
  }
  let chart = instances.get(dom.id)
  if (isValid(chart)) {
    logWarn('', '', 'The chart has been initialized on the dom！！！')
    return chart
  }
  const id = `k_line_chart_${chartBaseId++}`
  chart = new ChartImp(dom, options)
  chart.id = id
  dom.setAttribute('k-line-chart-id', id)
  instances.set(id, chart)
  return chart
}

/**
 * Destroy chart instance
 * @param dcs
 */
function dispose (dcs                              )       {
  let id
  if (dcs instanceof ChartImp) {
    id = dcs.id
  } else {
    let dom
    if (isString(dcs)) {
      dom = document.getElementById(dcs)
    } else {
      dom = dcs
    }
    id = dom?.getAttribute('k-line-chart-id') ?? null
  }
  if (id !== null) {
    instances.get(id)?.destroy()
    instances.delete(id)
  }
}

const utils = {
  clone,
  merge,
  isString,
  isNumber,
  isValid,
  isObject,
  isArray,
  isFunction,
  isBoolean,
  formatValue,
  formatPrecision,
  formatBigNumber,
  formatDate,
  formatThousands,
  formatFoldDecimal,
  calcTextWidth,
  getLinearSlopeIntercept,
  getLinearYFromSlopeIntercept,
  getLinearYFromCoordinates,
  checkCoordinateOnArc,
  checkCoordinateOnCircle,
  checkCoordinateOnLine,
  checkCoordinateOnPolygon,
  checkCoordinateOnRect,
  checkCoordinateOnText,
  drawArc,
  drawCircle,
  drawLine,
  drawPolygon,
  drawRect,
  drawText,
  drawRectText
}




},
function ($exports, $load) {
Object.defineProperty($exports, "FormatDateType", { enumerable: true, get: () => FormatDateType });
Object.defineProperty($exports, "getDefaultCustomApi", { enumerable: true, get: () => getDefaultCustomApi });
Object.defineProperty($exports, "defaultLocale", { enumerable: true, get: () => defaultLocale });
Object.defineProperty($exports, "LayoutChildType", { enumerable: true, get: () => LayoutChildType });
const $mod0 = $load(81);
const formatDate = $mod0.formatDate;
const formatBigNumber = $mod0.formatBigNumber;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */








const FormatDateType = { Tooltip: 0, 0: "Tooltip", Crosshair: 1, 1: "Crosshair", XAxis: 2, 2: "XAxis" };










function getDefaultCustomApi ()            {
  return {
    formatDate,
    formatBigNumber
  }
}

const defaultLocale = 'en-US'













const LayoutChildType = { Candle: 'candle', Indicator: 'indicator', XAxis: 'xAxis' };


















},
function ($exports, $load) {
Object.defineProperty($exports, "ActionType", { enumerable: true, get: () => ActionType });
Object.defineProperty($exports, "default", { enumerable: true, get: () => Delegate });
const $mod0 = $load(87);
const isFunction = $mod0.isFunction;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */





const ActionType = { OnDataReady: 'onDataReady', OnZoom: 'onZoom', OnScroll: 'onScroll', OnVisibleRangeChange: 'onVisibleRangeChange', OnTooltipIconClick: 'onTooltipIconClick', OnCrosshairChange: 'onCrosshairChange', OnCandleBarClick: 'onCandleBarClick', OnPaneDrag: 'onPaneDrag' };

class Delegate {
          _callbacks                   = []

  subscribe (callback                )       {
    const index = this._callbacks.indexOf(callback) ?? -1
    if (index < 0) {
      this._callbacks.push(callback)
    }
  }

  unsubscribe (callback                 )       {
    if (isFunction(callback)) {
      const index = this._callbacks.indexOf(callback) ?? -1
      if (index > -1) {
        this._callbacks.splice(index, 1)
      }
    } else {
      this._callbacks = []
    }
  }

  execute (data      )       {
    this._callbacks.forEach(callback => {
      callback(data)
    })
  }

  isEmpty ()          {
    return this._callbacks.length === 0
  }
}


},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => Animation });
const $mod0 = $load(79);
const requestAnimationFrame = $mod0.requestAnimationFrame;
const $mod2 = $load(87);
const merge = $mod2.merge;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */












class Animation {
                   _options = { duration: 500, iterationCount: 1 }

          _doFrameCallback

          _currentIterationCount = 0
          _running = false

          _time = 0

  constructor (options                            ) {
    merge(this._options, options)
  }

  _loop ()       {
    this._running = true
    const step               = () => {
      if (this._running) {
        const diffTime = new Date().getTime() - this._time
        if (diffTime < this._options.duration) {
          this._doFrameCallback?.(diffTime)
          requestAnimationFrame(step)
        } else {
          this.stop()
          this._currentIterationCount++
          if (this._currentIterationCount < this._options.iterationCount) {
            this.start()
          }
        }
      }
    }
    requestAnimationFrame(step)
  }

  doFrame (callback                          )       {
    this._doFrameCallback = callback
    return this
  }

  setDuration (duration        )       {
    this._options.duration = duration
    return this
  }

  setIterationCount (iterationCount        )       {
    this._options.iterationCount = iterationCount
    return this
  }

  start ()       {
    if (!this._running) {
      this._time = new Date().getTime()
      this._loop()
    }
  }

  stop ()       {
    if (this._running) {
      this._doFrameCallback?.(this._options.duration)
    }
    this._running = false
  }
}


},
function ($exports, $load) {


/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */









},
function ($exports, $load) {
Object.defineProperty($exports, "createDefaultBounding", { enumerable: true, get: () => createDefaultBounding });
const $mod0 = $load(87);
const isValid = $mod0.isValid;
const merge = $mod0.merge;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */












function createDefaultBounding (bounding                    )           {
  const defaultBounding           = {
    width: 0,
    height: 0,
    left: 0,
    right: 0,
    top: 0,
    bottom: 0
  }
  if (isValid(bounding)) {
    merge(defaultBounding, bounding)
  }
  return defaultBounding
}


},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => Canvas });
const $mod0 = $load(77);
const getPixelRatio = $mod0.getPixelRatio;
const $mod2 = $load(80);
const createDom = $mod2.createDom;
const $mod4 = $load(87);
const isValid = $mod4.isValid;
const $mod6 = $load(79);
const requestAnimationFrame = $mod6.requestAnimationFrame;
const DEFAULT_REQUEST_ID = $mod6.DEFAULT_REQUEST_ID;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */








async function isSupportedDevicePixelContentBox ()                   {
  return await new Promise((resolve                        ) => {
    const ro = new ResizeObserver((entries                       ) => {
      resolve(entries.every(entry => 'devicePixelContentBoxSize' in entry))
      ro.disconnect()
    })
    ro.observe(document.body, { box: 'device-pixel-content-box' })
  }).catch(() => false)
}

class Canvas {
                   _element
          _resizeObserver
          _mediaQueryList

                   _ctx

                   _listener

          _supportedDevicePixelContentBox = false

          _width = 0
          _height = 0

          _pixelWidth = 0
          _pixelHeight = 0

          _nextPixelWidth = 0
          _nextPixelHeight = 0

          _requestAnimationId = DEFAULT_REQUEST_ID

                   _mediaQueryListener             = () => {
    const pixelRatio = getPixelRatio(this._element)
    this._nextPixelWidth = Math.round(this._element.clientWidth * pixelRatio)
    this._nextPixelHeight = Math.round(this._element.clientHeight * pixelRatio)
    this._resetPixelRatio()
  }

  constructor (style                              , listener              ) {
    this._listener = listener
    this._element = createDom('canvas', style)
    this._ctx = this._element.getContext('2d', { willReadFrequently: true })
    isSupportedDevicePixelContentBox().then(result => {
      this._supportedDevicePixelContentBox = result
      if (result) {
        this._resizeObserver = new ResizeObserver((entries                       ) => {
          const entry = entries.find((entry                     ) => entry.target === this._element)
          const size = entry?.devicePixelContentBoxSize?.[0]
          if (isValid(size)) {
            this._nextPixelWidth = size.inlineSize
            this._nextPixelHeight = size.blockSize
            if (this._pixelWidth !== this._nextPixelWidth || this._pixelHeight !== this._nextPixelHeight) {
              this._resetPixelRatio()
            }
          }
        })
        this._resizeObserver.observe(this._element, { box: 'device-pixel-content-box' })
      } else {
        this._mediaQueryList = window.matchMedia(`(resolution: ${getPixelRatio(this._element)}dppx)`)
        this._mediaQueryList.addListener(this._mediaQueryListener)
      }
    }).catch(_ => false)
  }

          _resetPixelRatio ()       {
    this._executeListener(() => {
      const width = this._element.clientWidth
      const height = this._element.clientHeight
      const horizontalPixelRatio = this._nextPixelWidth / width
      const verticalPixelRatio = this._nextPixelHeight / height
      this._width = width
      this._height = height
      this._pixelWidth = this._nextPixelWidth
      this._pixelHeight = this._nextPixelHeight
      this._element.width = this._nextPixelWidth
      this._element.height = this._nextPixelHeight
      this._ctx.scale(horizontalPixelRatio, verticalPixelRatio)
    })
  }

          _executeListener (fn             )       {
    if (this._requestAnimationId === DEFAULT_REQUEST_ID) {
      this._requestAnimationId = requestAnimationFrame(() => {
        this._ctx.clearRect(0, 0, this._width, this._height)
        fn?.()
        this._listener()
        this._requestAnimationId = DEFAULT_REQUEST_ID
      })
    }
  }

  update (w        , h        )       {
    if (this._width !== w || this._height !== h) {
      this._element.style.width = `${w}px`
      this._element.style.height = `${h}px`
      if (!this._supportedDevicePixelContentBox) {
        const pixelRatio = getPixelRatio(this._element)
        this._nextPixelWidth = Math.round(w * pixelRatio)
        this._nextPixelHeight = Math.round(h * pixelRatio)
        this._resetPixelRatio()
      }
    } else {
      this._executeListener()
    }
  }

  getElement ()                    {
    return this._element
  }

  getContext ()                           {
    return this._ctx
  }

  destroy ()       {
    if (isValid(this._resizeObserver)) {
      this._resizeObserver.unobserve(this._element)
    }
    if (isValid(this._mediaQueryList)) {
      this._mediaQueryList.removeListener(this._mediaQueryListener)
    }
  }
}


},
function ($exports, $load) {
Object.defineProperty($exports, "getDistance", { enumerable: true, get: () => getDistance });

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */






function getDistance (coordinate1            , coordinate2            )         {
  const xDif = coordinate1.x - coordinate2.x
  const yDif = coordinate1.y - coordinate2.y
  return Math.sqrt(xDif * xDif + yDif * yDif)
}


},
function ($exports, $load) {


/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */













},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => DeepPartial });

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */














},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => DeepRequired });

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */














},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => Eventful });
const $mod0 = $load(87);
const isValid = $mod0.isValid;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */









class Eventful                            {
          _children             = []

                   _callbacks = new Map                                    ()

  registerEvent (name           , callback                         )       {
    this._callbacks.set(name, callback)
    return this
  }

  onEvent (name           , event                 , other         )          {
    const callback = this._callbacks.get(name)
    if (isValid(callback) && this.checkEventOn(event)) {
      return callback(event, other)
    }
    return false
  }

  checkEventOn (event                 )          {
    for (const eventful of this._children) {
      if (eventful.checkEventOn(event)) {
        return true
      }
    }
    return false
  }

  dispatchEvent (name           , event                 , other         )          {
    const start = this._children.length - 1
    if (start > -1) {
      for (let i = start; i > -1; i--) {
        if (this._children[i].dispatchEvent(name, event, other)) {
          return true
        }
      }
    }
    return this.onEvent(name, event, other)
  }

  addChild (eventful          )       {
    this._children.push(eventful)
    return this
  }

  clear ()       {
    this._children = []
  }
}


},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => ExcludePickPartial });

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */






},
function ($exports, $load) {


/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */













},
function ($exports, $load) {
Object.defineProperty($exports, "LoadDataType", { enumerable: true, get: () => LoadDataType });
Object.defineProperty($exports, "default", { enumerable: true, get: () => LoadDataCallback });

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */




const LoadDataType = { Init: 'init', Forward: 'forward', Backward: 'backward' };














},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => LoadMoreCallback });

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */



/**
 * Since v9.8.0 deprecated, since v10 removed
 * @deprecated
 */





},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => Nullable });

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */






},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => PickPartial });

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */






},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => PickRequired });

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */






},
function ($exports, $load) {


/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */








},
function ($exports, $load) {


/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */







},
function ($exports, $load) {
Object.defineProperty($exports, "LineType", { enumerable: true, get: () => LineType });
Object.defineProperty($exports, "PolygonType", { enumerable: true, get: () => PolygonType });
Object.defineProperty($exports, "TooltipShowRule", { enumerable: true, get: () => TooltipShowRule });
Object.defineProperty($exports, "TooltipShowType", { enumerable: true, get: () => TooltipShowType });
Object.defineProperty($exports, "TooltipIconPosition", { enumerable: true, get: () => TooltipIconPosition });
Object.defineProperty($exports, "CandleTooltipRectPosition", { enumerable: true, get: () => CandleTooltipRectPosition });
Object.defineProperty($exports, "CandleType", { enumerable: true, get: () => CandleType });
Object.defineProperty($exports, "YAxisPosition", { enumerable: true, get: () => YAxisPosition });
Object.defineProperty($exports, "YAxisType", { enumerable: true, get: () => YAxisType });
Object.defineProperty($exports, "getDefaultStyles", { enumerable: true, get: () => getDefaultStyles });

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

























/**
 * line type
 */
const LineType = { Dashed: 'dashed', Solid: 'solid' };
















const PolygonType = { Stroke: 'stroke', Fill: 'fill', StrokeFill: 'stroke_fill' };




























/**
 * @deprecated
 * Starting from v10, it will be deleted
 */






/**
 * @deprecated
 * Starting from v10, it will be deleted
 */




const TooltipShowRule = { Always: 'always', FollowCross: 'follow_cross', None: 'none' };

const TooltipShowType = { Standard: 'standard', Rect: 'rect' };

























/**
 * @deprecated
 * Starting from v10, it will be deleted
 */







/**
 * @deprecated
 * Starting from v10, it will be deleted
 */


const TooltipIconPosition = { Left: 'left', Middle: 'middle', Right: 'right' };






























































const CandleTooltipRectPosition = { Fixed: 'fixed', Pointer: 'pointer' };


















const CandleType = { CandleSolid: 'candle_solid', CandleStroke: 'candle_stroke', CandleUpStroke: 'candle_up_stroke', CandleDownStroke: 'candle_down_stroke', Ohlc: 'ohlc', Area: 'area' };





























































const YAxisPosition = { Left: 'left', Right: 'right' };

const YAxisType = { Normal: 'normal', Percentage: 'percentage', Log: 'log' };

































































const red = '#F92855'
const alphaRed = 'rgba(249, 40, 85, .7)'
const green = '#2DC08E'
const alphaGreen = 'rgba(45, 192, 142, .7)'
const grey = '#888888'
const white = '#FFFFFF'
const blue = '#1677FF'
const textColor = '#76808F'
const axisLineColor = '#DDDDDD'

function getAlphaBlue (alpha        )         {
  return `rgba(22, 119, 255, ${alpha})`
}

function getDefaultGridStyle ()            {
  function item ()                 {
    return {
      show: true,
      size: 1,
      color: '#EDEDED',
      style: LineType.Dashed,
      dashedValue: [2, 2]
    }
  }
  return {
    show: true,
    horizontal: item(),
    vertical: item()
  }
}

/**
 * Get default candle style
 * @type {{area: {backgroundColor: [{offset: number, color: string}, {offset: number, color: string}], lineColor: string, lineSize: number, value: string}, bar: {noChangeColor: string, upColor: string, downColor: string}, tooltip: {rect: {offsetTop: number, fillColor: string, borderColor: string, paddingBottom: number, borderRadius: number, paddingRight: number, borderSize: number, offsetLeft: number, paddingTop: number, paddingLeft: number, offsetRight: number}, showRule: string, values: null, showType: string, text: {marginRight: number, size: number, color: string, weight: string, marginBottom: number, family: string, marginTop: number, marginLeft: number}, labels: string[]}, type: string, priceMark: {high: {textMargin: number, textSize: number, color: string, textFamily: string, show: boolean, textWeight: string}, last: {noChangeColor: string, upColor: string, line: {dashValue: number[], size: number, show: boolean, style: string}, show: boolean, text: {paddingBottom: number, size: number, color: string, paddingRight: number, show: boolean, weight: string, paddingTop: number, family: string, paddingLeft: number}, downColor: string}, low: {textMargin: number, textSize: number, color: string, textFamily: string, show: boolean, textWeight: string}, show: boolean}}}
 */
function getDefaultCandleStyle ()              {
  const highLow = {
    show: true,
    color: textColor,
    textOffset: 5,
    textSize: 10,
    textFamily: 'Helvetica Neue',
    textWeight: 'normal'
  }
  return {
    type: CandleType.CandleSolid,
    bar: {
      upColor: green,
      downColor: red,
      noChangeColor: grey,
      upBorderColor: green,
      downBorderColor: red,
      noChangeBorderColor: grey,
      upWickColor: green,
      downWickColor: red,
      noChangeWickColor: grey
    },
    area: {
      lineSize: 2,
      lineColor: blue,
      smooth: false,
      value: 'close',
      backgroundColor: [{
        offset: 0,
        color: getAlphaBlue(0.01)
      }, {
        offset: 1,
        color: getAlphaBlue(0.2)
      }],
      point: {
        show: true,
        color: blue,
        radius: 4,
        rippleColor: getAlphaBlue(0.3),
        rippleRadius: 8,
        animation: true,
        animationDuration: 1000
      }
    },
    priceMark: {
      show: true,
      high: { ...highLow },
      low: { ...highLow },
      last: {
        show: true,
        upColor: green,
        downColor: red,
        noChangeColor: grey,
        line: {
          show: true,
          style: LineType.Dashed,
          dashedValue: [4, 4],
          size: 1
        },
        text: {
          show: true,
          style: PolygonType.Fill,
          size: 12,
          paddingLeft: 4,
          paddingTop: 4,
          paddingRight: 4,
          paddingBottom: 4,
          borderColor: 'transparent',
          borderStyle: LineType.Solid,
          borderSize: 0,
          borderDashedValue: [2, 2],
          color: white,
          family: 'Helvetica Neue',
          weight: 'normal',
          borderRadius: 2
        }
      }
    },
    tooltip: {
      offsetLeft: 4,
      offsetTop: 6,
      offsetRight: 4,
      offsetBottom: 6,
      showRule: TooltipShowRule.Always,
      showType: TooltipShowType.Standard,
      custom: [
        { title: 'time', value: '{time}' },
        { title: 'open', value: '{open}' },
        { title: 'high', value: '{high}' },
        { title: 'low', value: '{low}' },
        { title: 'close', value: '{close}' },
        { title: 'volume', value: '{volume}' }
      ],
      defaultValue: 'n/a',
      rect: {
        position: CandleTooltipRectPosition.Fixed,
        paddingLeft: 4,
        paddingRight: 4,
        paddingTop: 4,
        paddingBottom: 4,
        offsetLeft: 4,
        offsetTop: 4,
        offsetRight: 4,
        offsetBottom: 4,
        borderRadius: 4,
        borderSize: 1,
        borderColor: '#F2F3F5',
        color: '#FEFEFE'
      },
      text: {
        size: 12,
        family: 'Helvetica Neue',
        weight: 'normal',
        color: textColor,
        marginLeft: 8,
        marginTop: 4,
        marginRight: 8,
        marginBottom: 4
      },
      icons: []
    }
  }
}

/**
 * Get default indicator style
 */
function getDefaultIndicatorStyle ()                 {
  const lines = ['#FF9600', '#935EBD', blue, '#E11D74', '#01C5C4'].map(color => ({
    style: LineType.Solid,
    smooth: false,
    size: 1,
    dashedValue: [2, 2],
    color
  }))

  return {
    ohlc: {
      upColor: alphaGreen,
      downColor: alphaRed,
      noChangeColor: grey
    },
    bars: [{
      style: PolygonType.Fill,
      borderStyle: LineType.Solid,
      borderSize: 1,
      borderDashedValue: [2, 2],
      upColor: alphaGreen,
      downColor: alphaRed,
      noChangeColor: grey
    }],
    lines,
    circles: [{
      style: PolygonType.Fill,
      borderStyle: LineType.Solid,
      borderSize: 1,
      borderDashedValue: [2, 2],
      upColor: alphaGreen,
      downColor: alphaRed,
      noChangeColor: grey
    }],
    lastValueMark: {
      show: false,
      text: {
        show: false,
        style: PolygonType.Fill,
        color: white,
        size: 12,
        family: 'Helvetica Neue',
        weight: 'normal',
        borderStyle: LineType.Solid,
        borderColor: 'transparent',
        borderSize: 0,
        borderDashedValue: [2, 2],
        paddingLeft: 4,
        paddingTop: 4,
        paddingRight: 4,
        paddingBottom: 4,
        borderRadius: 2
      }
    },
    tooltip: {
      offsetLeft: 4,
      offsetTop: 6,
      offsetRight: 4,
      offsetBottom: 6,
      showRule: TooltipShowRule.Always,
      showType: TooltipShowType.Standard,
      showName: true,
      showParams: true,
      defaultValue: 'n/a',
      text: {
        size: 12,
        family: 'Helvetica Neue',
        weight: 'normal',
        color: textColor,
        marginLeft: 8,
        marginTop: 4,
        marginRight: 8,
        marginBottom: 4
      },
      icons: []
    }
  }
}

function getDefaultXAxisStyle ()             {
  return {
    show: true,
    size: 'auto',
    axisLine: {
      show: true,
      color: axisLineColor,
      size: 1
    },
    tickText: {
      show: true,
      color: textColor,
      size: 12,
      family: 'Helvetica Neue',
      weight: 'normal',
      marginStart: 4,
      marginEnd: 4
    },
    tickLine: {
      show: true,
      size: 1,
      length: 3,
      color: axisLineColor
    }
  }
}

function getDefaultYAxisStyle ()             {
  const style = getDefaultXAxisStyle()
  style.type = YAxisType.Normal
  style.position = YAxisPosition.Right
  style.inside = false
  style.reverse = false
  return style
}

function getDefaultCrosshairStyle ()                 {
  function item ()                          {
    return {
      show: true,
      line: {
        show: true,
        style: LineType.Dashed,
        dashedValue: [4, 2],
        size: 1,
        color: textColor
      },
      text: {
        show: true,
        style: PolygonType.Fill,
        color: white,
        size: 12,
        family: 'Helvetica Neue',
        weight: 'normal',
        borderStyle: LineType.Solid,
        borderDashedValue: [2, 2],
        borderSize: 1,
        borderColor: textColor,
        borderRadius: 2,
        paddingLeft: 4,
        paddingRight: 4,
        paddingTop: 4,
        paddingBottom: 4,
        backgroundColor: textColor
      }
    }
  }

  return {
    show: true,
    horizontal: item(),
    vertical: item()
  }
}

function getDefaultOverlayStyle ()               {
  const pointBorderColor = getAlphaBlue(0.35)
  const alphaBg = getAlphaBlue(0.25)
  function text ()            {
    return {
      style: PolygonType.Fill,
      color: white,
      size: 12,
      family: 'Helvetica Neue',
      weight: 'normal',
      borderStyle: LineType.Solid,
      borderDashedValue: [2, 2],
      borderSize: 1,
      borderRadius: 2,
      borderColor: blue,
      paddingLeft: 4,
      paddingRight: 4,
      paddingTop: 4,
      paddingBottom: 4,
      backgroundColor: blue
    }
  }
  return {
    point: {
      color: blue,
      borderColor: pointBorderColor,
      borderSize: 1,
      radius: 5,
      activeColor: blue,
      activeBorderColor: pointBorderColor,
      activeBorderSize: 3,
      activeRadius: 5
    },
    line: {
      style: LineType.Solid,
      smooth: false,
      color: blue,
      size: 1,
      dashedValue: [2, 2]
    },
    rect: {
      style: PolygonType.Fill,
      color: alphaBg,
      borderColor: blue,
      borderSize: 1,
      borderRadius: 0,
      borderStyle: LineType.Solid,
      borderDashedValue: [2, 2]
    },
    polygon: {
      style: PolygonType.Fill,
      color: blue,
      borderColor: blue,
      borderSize: 1,
      borderStyle: LineType.Solid,
      borderDashedValue: [2, 2]
    },
    circle: {
      style: PolygonType.Fill,
      color: alphaBg,
      borderColor: blue,
      borderSize: 1,
      borderStyle: LineType.Solid,
      borderDashedValue: [2, 2]
    },
    arc: {
      style: LineType.Solid,
      color: blue,
      size: 1,
      dashedValue: [2, 2]
    },
    text: text(),
    rectText: text()
  }
}

function getDefaultSeparatorStyle ()                 {
  return {
    size: 1,
    color: axisLineColor,
    fill: true,
    activeBackgroundColor: getAlphaBlue(0.08)
  }
}

function getDefaultStyles ()         {
  return {
    grid: getDefaultGridStyle(),
    candle: getDefaultCandleStyle(),
    indicator: getDefaultIndicatorStyle(),
    xAxis: getDefaultXAxisStyle(),
    yAxis: getDefaultYAxisStyle(),
    separator: getDefaultSeparatorStyle(),
    crosshair: getDefaultCrosshairStyle(),
    overlay: getDefaultOverlayStyle()
  }
}


},
function ($exports, $load) {
Object.defineProperty($exports, "TOUCH_MIN_RADIUS", { enumerable: true, get: () => TOUCH_MIN_RADIUS });
Object.defineProperty($exports, "default", { enumerable: true, get: () => SyntheticEvent });
const $mod0 = $load(86);
const isFF = $mod0.isFF;
const isIOS = $mod0.isIOS;
const $mod3 = $load(87);
const isValid = $mod3.isValid;
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * This file uses most of the logic of lightweight-charts/mouse-event-handler.ts(https://github.com/tradingview/lightweight-charts) for reference.
 * Makes some modifications to add some events.
 * The use of the source code of this file is also subject to the terms
 * and consitions of the license of "lightweight-charts" (Apache License V2, see
 * </licenses/LICENSE-lightweight-charts>).
 */


























































// we can use `const name = 500;` but with `const enum` this values will be inlined into code
// so we do not need to have it as variables
const Delay = { ResetClick: 500, 500: "ResetClick", LongTap: 500, 500: "LongTap", PreventFiresTouchEvents: 500, 500: "PreventFiresTouchEvents" };

const ManhattanDistance = { CancelClick: 5, 5: "CancelClick", CancelTap: 5, 5: "CancelTap", DoubleClick: 5, 5: "DoubleClick", DoubleTap: 30, 30: "DoubleTap" };

const MouseEventButton = { Left: 0, 0: "Left", Middle: 1, 1: "Middle", Right: 2, 2: "Right" };

const TOUCH_MIN_RADIUS = 10









// TODO: get rid of a lot of boolean flags, probably we should replace it with some enum
class SyntheticEvent {
                   _target
                   _handler

                   _options

          _clickCount         = 0
          _clickTimeoutId                    = null
          _clickCoordinate             = { x: Number.NEGATIVE_INFINITY, y: Number.POSITIVE_INFINITY }

          _tapCount         = 0
          _tapTimeoutId                    = null
          _tapCoordinate             = { x: Number.NEGATIVE_INFINITY, y: Number.POSITIVE_INFINITY }

          _longTapTimeoutId                    = null
          _longTapActive          = false

          _mouseMoveStartCoordinate                       = null

          _touchMoveStartCoordinate                       = null
          _touchMoveExceededManhattanDistance          = false

          _cancelClick          = false
          _cancelTap          = false

          _unsubscribeOutsideMouseEvents                       = null
          _unsubscribeOutsideTouchEvents                       = null
          _unsubscribeMobileSafariEvents                       = null

          _unsubscribeMousemove                       = null

          _unsubscribeMouseWheel                       = null

          _unsubscribeContextMenu                       = null

          _unsubscribeRootMouseEvents                       = null
          _unsubscribeRootTouchEvents                       = null

          _startPinchMiddleCoordinate                       = null
          _startPinchDistance         = 0
          _pinchPrevented          = false
          _preventTouchDragProcess          = false

          _mousePressed          = false

          _lastTouchEventTimeStamp         = 0

  // for touchstart/touchmove/touchend events we handle only first touch
  // i.e. we don't support several active touches at the same time (except pinch event)
          _activeTouchId                   = null

  // accept all mouse leave events if it's not an iOS device
  // see _mouseEnterHandler, _mouseMoveHandler, _mouseLeaveHandler
          _acceptMouseLeave          = !isIOS()

  constructor (
    target             ,
    handler              ,
    options
  ) {
    this._target = target
    this._handler = handler
    this._options = options

    this._init()
  }

  destroy ()       {
    if (this._unsubscribeOutsideMouseEvents !== null) {
      this._unsubscribeOutsideMouseEvents()
      this._unsubscribeOutsideMouseEvents = null
    }

    if (this._unsubscribeOutsideTouchEvents !== null) {
      this._unsubscribeOutsideTouchEvents()
      this._unsubscribeOutsideTouchEvents = null
    }

    if (this._unsubscribeMousemove !== null) {
      this._unsubscribeMousemove()
      this._unsubscribeMousemove = null
    }

    if (this._unsubscribeMouseWheel !== null) {
      this._unsubscribeMouseWheel()
      this._unsubscribeMouseWheel = null
    }

    if (this._unsubscribeContextMenu !== null) {
      this._unsubscribeContextMenu()
      this._unsubscribeContextMenu = null
    }

    if (this._unsubscribeRootMouseEvents !== null) {
      this._unsubscribeRootMouseEvents()
      this._unsubscribeRootMouseEvents = null
    }

    if (this._unsubscribeRootTouchEvents !== null) {
      this._unsubscribeRootTouchEvents()
      this._unsubscribeRootTouchEvents = null
    }

    if (this._unsubscribeMobileSafariEvents !== null) {
      this._unsubscribeMobileSafariEvents()
      this._unsubscribeMobileSafariEvents = null
    }

    this._clearLongTapTimeout()
    this._resetClickTimeout()
  }

          _mouseEnterHandler (enterEvent            )       {
    this._unsubscribeMousemove?.()
    this._unsubscribeMouseWheel?.()
    this._unsubscribeContextMenu?.()

    const boundMouseMoveHandler = this._mouseMoveHandler.bind(this)
    this._unsubscribeMousemove = () => {
      this._target.removeEventListener('mousemove', boundMouseMoveHandler)
    }
    this._target.addEventListener('mousemove', boundMouseMoveHandler)

    const boundMouseWheel = this._mouseWheelHandler.bind(this)
    this._unsubscribeMouseWheel = () => {
      this._target.removeEventListener('wheel', boundMouseWheel)
    }
    this._target.addEventListener('wheel', boundMouseWheel, { passive: false })

    const boundContextMenu = this._contextMenuHandler.bind(this)
    this._unsubscribeContextMenu = () => {
      this._target.removeEventListener('contextmenu', boundContextMenu)
    }
    this._target.addEventListener('contextmenu', boundContextMenu, { passive: false })

    if (this._firesTouchEvents(enterEvent)) {
      return
    }

    this._processEvent(this._makeCompatEvent(enterEvent), this._handler.mouseEnterEvent)
    this._acceptMouseLeave = true
  }

          _resetClickTimeout ()       {
    if (this._clickTimeoutId !== null) {
      clearTimeout(this._clickTimeoutId)
    }

    this._clickCount = 0
    this._clickTimeoutId = null
    this._clickCoordinate = { x: Number.NEGATIVE_INFINITY, y: Number.POSITIVE_INFINITY }
  }

          _resetTapTimeout ()       {
    if (this._tapTimeoutId !== null) {
      clearTimeout(this._tapTimeoutId)
    }

    this._tapCount = 0
    this._tapTimeoutId = null
    this._tapCoordinate = { x: Number.NEGATIVE_INFINITY, y: Number.POSITIVE_INFINITY }
  }

          _mouseMoveHandler (moveEvent            )       {
    if (this._mousePressed || this._touchMoveStartCoordinate !== null) {
      return
    }

    if (this._firesTouchEvents(moveEvent)) {
      return
    }

    this._processEvent(this._makeCompatEvent(moveEvent), this._handler.mouseMoveEvent)
    this._acceptMouseLeave = true
  }

          _mouseWheelHandler (wheelEvent            )       {
    if (Math.abs(wheelEvent.deltaX) > Math.abs(wheelEvent.deltaY)) {
      if (!isValid(this._handler.mouseWheelHortEvent)) {
        return
      }
      this._preventDefault(wheelEvent)
      if (Math.abs(wheelEvent.deltaX) === 0) {
        return
      }
      this._handler.mouseWheelHortEvent(this._makeCompatEvent(wheelEvent), -wheelEvent.deltaX)
    } else {
      if (!isValid(this._handler.mouseWheelVertEvent)) {
        return
      }
      let deltaY = -(wheelEvent.deltaY / 100)
      if (deltaY === 0) {
        return
      }
      this._preventDefault(wheelEvent)

      switch (wheelEvent.deltaMode) {
        case wheelEvent.DOM_DELTA_PAGE:
          deltaY *= 120
          break

        case wheelEvent.DOM_DELTA_LINE:
          deltaY *= 32
          break
      }

      if (deltaY !== 0) {
        const scale = Math.sign(deltaY) * Math.min(1, Math.abs(deltaY))
        this._handler.mouseWheelVertEvent(this._makeCompatEvent(wheelEvent), scale)
      }
    }
  }

          _contextMenuHandler (mouseEvent            )       {
    this._preventDefault(mouseEvent)
  }

          _touchMoveHandler (moveEvent            )       {
    const touch = this._touchWithId(moveEvent.changedTouches, this._activeTouchId)
    if (touch === null) {
      return
    }

    this._lastTouchEventTimeStamp = this._eventTimeStamp(moveEvent)

    if (this._startPinchMiddleCoordinate !== null) {
      return
    }

    if (this._preventTouchDragProcess) {
      return
    }

    // prevent pinch if move event comes faster than the second touch
    this._pinchPrevented = true

    const moveInfo = this._mouseTouchMoveWithDownInfo(this._getCoordinate(touch), this._touchMoveStartCoordinate )
    const { xOffset, yOffset, manhattanDistance } = moveInfo

    if (!this._touchMoveExceededManhattanDistance && manhattanDistance < ManhattanDistance.CancelTap) {
      return
    }

    if (!this._touchMoveExceededManhattanDistance) {
      // first time when current position exceeded manhattan distance

      // vertical drag is more important than horizontal drag
      // because we scroll the page vertically often than horizontally
      const correctedXOffset = xOffset * 0.5

      // a drag can be only if touch page scroll isn't allowed
      const isVertDrag = yOffset >= correctedXOffset && !this._options.treatVertDragAsPageScroll()
      const isHorzDrag = correctedXOffset > yOffset && !this._options.treatHorzDragAsPageScroll()

      // if drag event happened then we should revert preventDefault state to original one
      // and try to process the drag event
      // else we shouldn't prevent default of the event and ignore processing the drag event
      if (!isVertDrag && !isHorzDrag) {
        this._preventTouchDragProcess = true
      }

      this._touchMoveExceededManhattanDistance = true
      // if manhattan distance is more that 5 - we should cancel tap event
      this._cancelTap = true
      this._clearLongTapTimeout()
      this._resetTapTimeout()
    }

    if (!this._preventTouchDragProcess) {
      this._processEvent(this._makeCompatEvent(moveEvent, touch), this._handler.touchMoveEvent)

      // we should prevent default in case of touch only
      // to prevent scroll of the page
      // preventDefault(moveEvent)
    }
  }

          _mouseMoveWithDownHandler (moveEvent            )       {
    if (moveEvent.button !== MouseEventButton.Left) {
      return
    }

    const moveInfo = this._mouseTouchMoveWithDownInfo(this._getCoordinate(moveEvent), this._mouseMoveStartCoordinate )
    const { manhattanDistance } = moveInfo

    if (manhattanDistance >= ManhattanDistance.CancelClick) {
      // if manhattan distance is more that 5 - we should cancel click event
      this._cancelClick = true
      this._resetClickTimeout()
    }
    if (this._cancelClick) {
      // if this._cancelClick is true, that means that minimum manhattan distance is already exceeded
      this._processEvent(this._makeCompatEvent(moveEvent), this._handler.pressedMouseMoveEvent)
    }
  }

          _mouseTouchMoveWithDownInfo (currentCoordinate            , startCoordinate            )                             {
    const xOffset = Math.abs(startCoordinate.x - currentCoordinate.x)
    const yOffset = Math.abs(startCoordinate.y - currentCoordinate.y)

    const manhattanDistance = xOffset + yOffset

    return { xOffset, yOffset, manhattanDistance }
  }

  /**
   * In Firefox mouse events dont't fire if the mouse position is outside of the browser's border.
   * To prevent the mouse from hanging while pressed we're subscribing on the mouseleave event of the document element.
   * We're subscribing on mouseleave, but this event is actually fired on mouseup outside of the browser's border.
   */
                   _onFirefoxOutsideMouseUp = (mouseUpEvent            )       => {
    this._mouseUpHandler(mouseUpEvent)
  }

  /**
   * Safari doesn't fire touchstart/mousedown events on double tap since iOS 13.
   * There are two possible solutions:
   * 1) Call preventDefault in touchEnd handler. But it also prevents click event from firing.
   * 2) Add listener on dblclick event that fires with the preceding mousedown/mouseup.
   * https://developer.apple.com/forums/thread/125073
   */
                   _onMobileSafariDoubleClick = (dblClickEvent            )       => {
    if (this._firesTouchEvents(dblClickEvent)) {
      ++this._tapCount

      if (this._tapTimeoutId !== null && this._tapCount > 1) {
        const { manhattanDistance } = this._mouseTouchMoveWithDownInfo(this._getCoordinate(dblClickEvent), this._tapCoordinate)
        if (manhattanDistance < ManhattanDistance.DoubleTap && !this._cancelTap) {
          this._processEvent(this._makeCompatEvent(dblClickEvent), this._handler.doubleTapEvent)
        }
        this._resetTapTimeout()
      }
    } else {
      ++this._clickCount

      if (this._clickTimeoutId !== null && this._clickCount > 1) {
        const { manhattanDistance } = this._mouseTouchMoveWithDownInfo(this._getCoordinate(dblClickEvent), this._clickCoordinate)
        if (manhattanDistance < ManhattanDistance.DoubleClick && !this._cancelClick) {
          this._processEvent(this._makeCompatEvent(dblClickEvent), this._handler.mouseDoubleClickEvent)
        }
        this._resetClickTimeout()
      }
    }
  }

  // eslint-disable-next-line complexity
          _touchEndHandler (touchEndEvent            )       {
    let touch = this._touchWithId(touchEndEvent.changedTouches, this._activeTouchId)
    if (touch === null && touchEndEvent.touches.length === 0) {
      // something went wrong, somehow we missed the required touchend event
      // probably the browser has not sent this event
      touch = touchEndEvent.changedTouches[0]
    }

    if (touch === null) {
      return
    }

    this._activeTouchId = null
    this._lastTouchEventTimeStamp = this._eventTimeStamp(touchEndEvent)
    this._clearLongTapTimeout()
    this._touchMoveStartCoordinate = null

    if (this._unsubscribeRootTouchEvents !== null) {
      this._unsubscribeRootTouchEvents()
      this._unsubscribeRootTouchEvents = null
    }

    const compatEvent = this._makeCompatEvent(touchEndEvent, touch)
    this._processEvent(compatEvent, this._handler.touchEndEvent)
    ++this._tapCount

    if (this._tapTimeoutId !== null && this._tapCount > 1) {
      // check that both clicks are near enough
      const { manhattanDistance } = this._mouseTouchMoveWithDownInfo(this._getCoordinate(touch), this._tapCoordinate)
      if (manhattanDistance < ManhattanDistance.DoubleTap && !this._cancelTap) {
        this._processEvent(compatEvent, this._handler.doubleTapEvent)
      }
      this._resetTapTimeout()
    } else {
      if (!this._cancelTap) {
        this._processEvent(compatEvent, this._handler.tapEvent)

        // do not fire mouse events if tap handler was executed
        // prevent click event on new dom element (who appeared after tap)
        if (isValid(this._handler.tapEvent)) {
          this._preventDefault(touchEndEvent)
        }
      }
    }

    // prevent, for example, safari's dblclick-to-zoom or fast-click after long-tap
    // we handle mouseDoubleClickEvent here ourselves
    if (this._tapCount === 0) {
      this._preventDefault(touchEndEvent)
    }

    if (touchEndEvent.touches.length === 0) {
      if (this._longTapActive) {
        this._longTapActive = false
        // prevent native click event
        this._preventDefault(touchEndEvent)
      }
    }
  }

          _mouseUpHandler (mouseUpEvent            )       {
    if (mouseUpEvent.button !== MouseEventButton.Left) {
      return
    }

    const compatEvent = this._makeCompatEvent(mouseUpEvent)

    this._mouseMoveStartCoordinate = null
    this._mousePressed = false

    if (this._unsubscribeRootMouseEvents !== null) {
      this._unsubscribeRootMouseEvents()
      this._unsubscribeRootMouseEvents = null
    }

    if (isFF()) {
      const rootElement = this._target.ownerDocument.documentElement
      rootElement.removeEventListener('mouseleave', this._onFirefoxOutsideMouseUp)
    }

    if (this._firesTouchEvents(mouseUpEvent)) {
      return
    }

    this._processEvent(compatEvent, this._handler.mouseUpEvent)
    ++this._clickCount

    if (this._clickTimeoutId !== null && this._clickCount > 1) {
      // check that both clicks are near enough
      const { manhattanDistance } = this._mouseTouchMoveWithDownInfo(this._getCoordinate(mouseUpEvent), this._clickCoordinate)
      if (manhattanDistance < ManhattanDistance.DoubleClick && !this._cancelClick) {
        this._processEvent(compatEvent, this._handler.mouseDoubleClickEvent)
      }
      this._resetClickTimeout()
    } else {
      if (!this._cancelClick) {
        this._processEvent(compatEvent, this._handler.mouseClickEvent)
      }
    }
  }

          _clearLongTapTimeout ()       {
    if (this._longTapTimeoutId === null) {
      return
    }

    clearTimeout(this._longTapTimeoutId)
    this._longTapTimeoutId = null
  }

          _touchStartHandler (downEvent            )       {
    if (this._activeTouchId !== null) {
      return
    }
    const touch = downEvent.changedTouches[0]
    this._activeTouchId = touch.identifier

    this._lastTouchEventTimeStamp = this._eventTimeStamp(downEvent)

    const rootElement = this._target.ownerDocument.documentElement

    this._cancelTap = false
    this._touchMoveExceededManhattanDistance = false
    this._preventTouchDragProcess = false

    this._touchMoveStartCoordinate = this._getCoordinate(touch)

    if (this._unsubscribeRootTouchEvents !== null) {
      this._unsubscribeRootTouchEvents()
      this._unsubscribeRootTouchEvents = null
    }

    {
      const boundTouchMoveWithDownHandler = this._touchMoveHandler.bind(this)
      const boundTouchEndHandler = this._touchEndHandler.bind(this)

      this._unsubscribeRootTouchEvents = () => {
        rootElement.removeEventListener('touchmove', boundTouchMoveWithDownHandler)
        rootElement.removeEventListener('touchend', boundTouchEndHandler)
      }

      rootElement.addEventListener('touchmove', boundTouchMoveWithDownHandler, { passive: false })
      rootElement.addEventListener('touchend', boundTouchEndHandler, { passive: false })

      this._clearLongTapTimeout()
      this._longTapTimeoutId = setTimeout(this._longTapHandler.bind(this, downEvent), Delay.LongTap)
    }

    this._processEvent(this._makeCompatEvent(downEvent, touch), this._handler.touchStartEvent)

    if (this._tapTimeoutId === null) {
      this._tapCount = 0
      this._tapTimeoutId = setTimeout(this._resetTapTimeout.bind(this), Delay.ResetClick)
      this._tapCoordinate = this._getCoordinate(touch)
    }
  }

          _mouseDownHandler (downEvent            )       {
    if (downEvent.button === MouseEventButton.Right) {
      this._preventDefault(downEvent)
      this._processEvent(this._makeCompatEvent(downEvent), this._handler.mouseRightClickEvent)
      return
    }

    if (downEvent.button !== MouseEventButton.Left) {
      return
    }

    const rootElement = this._target.ownerDocument.documentElement
    if (isFF()) {
      rootElement.addEventListener('mouseleave', this._onFirefoxOutsideMouseUp)
    }

    this._cancelClick = false

    this._mouseMoveStartCoordinate = this._getCoordinate(downEvent)

    if (this._unsubscribeRootMouseEvents !== null) {
      this._unsubscribeRootMouseEvents()
      this._unsubscribeRootMouseEvents = null
    }

    {
      const boundMouseMoveWithDownHandler = this._mouseMoveWithDownHandler.bind(this)
      const boundMouseUpHandler = this._mouseUpHandler.bind(this)

      this._unsubscribeRootMouseEvents = () => {
        rootElement.removeEventListener('mousemove', boundMouseMoveWithDownHandler)
        rootElement.removeEventListener('mouseup', boundMouseUpHandler)
      }

      rootElement.addEventListener('mousemove', boundMouseMoveWithDownHandler)
      rootElement.addEventListener('mouseup', boundMouseUpHandler)
    }

    this._mousePressed = true

    if (this._firesTouchEvents(downEvent)) {
      return
    }

    this._processEvent(this._makeCompatEvent(downEvent), this._handler.mouseDownEvent)

    if (this._clickTimeoutId === null) {
      this._clickCount = 0
      this._clickTimeoutId = setTimeout(this._resetClickTimeout.bind(this), Delay.ResetClick)
      this._clickCoordinate = this._getCoordinate(downEvent)
    }
  }

          _init ()       {
    this._target.addEventListener('mouseenter', this._mouseEnterHandler.bind(this))

    // Do not show context menu when something went wrong
    this._target.addEventListener('touchcancel', this._clearLongTapTimeout.bind(this))

    {
      const doc = this._target.ownerDocument

      const outsideHandler = (event                         )       => {
        if (this._handler.mouseDownOutsideEvent == null) {
          return
        }

        if (event.composed && this._target.contains(event.composedPath()[0]           )) {
          return
        }

        if ((event.target !== null) && this._target.contains(event.target           )) {
          return
        }

        this._handler.mouseDownOutsideEvent({ x: 0, y: 0, pageX: 0, pageY: 0 })
      }

      this._unsubscribeOutsideTouchEvents = () => {
        doc.removeEventListener('touchstart', outsideHandler)
      }

      this._unsubscribeOutsideMouseEvents = () => {
        doc.removeEventListener('mousedown', outsideHandler)
      }

      doc.addEventListener('mousedown', outsideHandler)
      doc.addEventListener('touchstart', outsideHandler, { passive: true })
    }

    if (isIOS()) {
      this._unsubscribeMobileSafariEvents = () => {
        this._target.removeEventListener('dblclick', this._onMobileSafariDoubleClick)
      }
      this._target.addEventListener('dblclick', this._onMobileSafariDoubleClick)
    }

    this._target.addEventListener('mouseleave', this._mouseLeaveHandler.bind(this))

    this._target.addEventListener('touchstart', this._touchStartHandler.bind(this), { passive: true })

    this._target.addEventListener('mousedown', (e            ) => {
      if (e.button === MouseEventButton.Middle) {
        // prevent incorrect scrolling event
        e.preventDefault()
        return false
      }
      return undefined
    })

    this._target.addEventListener('mousedown', this._mouseDownHandler.bind(this))
    this._initPinch()

    // Hey mobile Safari, what's up?
    // If mobile Safari doesn't have any touchmove handler with passive=false
    // it treats a touchstart and the following touchmove events as cancelable=false,
    // so we can't prevent them (as soon we subscribe on touchmove inside touchstart's handler).
    // And we'll get scroll of the page along with chart's one instead of only chart's scroll.
    this._target.addEventListener('touchmove', () => {}, { passive: false })
  }

          _initPinch ()       {
    if (!isValid(this._handler.pinchStartEvent) &&
      !isValid(this._handler.pinchEvent) &&
      !isValid(this._handler.pinchEndEvent)
    ) {
      return
    }

    this._target.addEventListener(
      'touchstart',
      (event            ) => { this._checkPinchState(event.touches) },
      { passive: true }
    )

    this._target.addEventListener(
      'touchmove',
      (event            ) => {
        if (event.touches.length !== 2 || this._startPinchMiddleCoordinate === null) {
          return
        }
        if (isValid(this._handler.pinchEvent)) {
          const currentDistance = this._getTouchDistance(event.touches[0], event.touches[1])
          const scale = currentDistance / this._startPinchDistance
          this._handler.pinchEvent({ ...this._startPinchMiddleCoordinate, pageX: 0, pageY: 0 }, scale)
          this._preventDefault(event)
        }
      },
      { passive: false }
    )

    this._target.addEventListener('touchend', (event            ) => {
      this._checkPinchState(event.touches)
    })
  }

          _checkPinchState (touches           )       {
    if (touches.length === 1) {
      this._pinchPrevented = false
    }

    if (touches.length !== 2 || this._pinchPrevented || this._longTapActive) {
      this._stopPinch()
    } else {
      this._startPinch(touches)
    }
  }

          _startPinch (touches           )       {
    const box = this._target.getBoundingClientRect() ?? { left: 0, top: 0 }
    this._startPinchMiddleCoordinate = {
      x: ((touches[0].clientX - box.left) + (touches[1].clientX - box.left)) / 2,
      y: ((touches[0].clientY - box.top) + (touches[1].clientY - box.top)) / 2
    }

    this._startPinchDistance = this._getTouchDistance(touches[0], touches[1])

    if (isValid(this._handler.pinchStartEvent)) {
      this._handler.pinchStartEvent({ x: 0, y: 0, pageX: 0, pageY: 0 })
    }

    this._clearLongTapTimeout()
  }

          _stopPinch ()       {
    if (this._startPinchMiddleCoordinate === null) {
      return
    }

    this._startPinchMiddleCoordinate = null

    if (isValid(this._handler.pinchEndEvent)) {
      this._handler.pinchEndEvent({ x: 0, y: 0, pageX: 0, pageY: 0 })
    }
  }

          _mouseLeaveHandler (event            )       {
    this._unsubscribeMousemove?.()
    this._unsubscribeMouseWheel?.()
    this._unsubscribeContextMenu?.()

    if (this._firesTouchEvents(event)) {
      return
    }

    if (!this._acceptMouseLeave) {
      // mobile Safari sometimes emits mouse leave event for no reason, there is no way to handle it in other way
      // just ignore this event if there was no mouse move or mouse enter events
      return
    }

    this._processEvent(this._makeCompatEvent(event), this._handler.mouseLeaveEvent)

    // accept all mouse leave events if it's not an iOS device
    this._acceptMouseLeave = !isIOS()
  }

          _longTapHandler (event            )       {
    const touch = this._touchWithId(event.touches, this._activeTouchId)
    if (touch === null) {
      return
    }

    this._processEvent(this._makeCompatEvent(event, touch), this._handler.longTapEvent)
    this._cancelTap = true

    // long tap is active until touchend event with 0 touches occurred
    this._longTapActive = true
  }

          _firesTouchEvents (e            )          {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    if (isValid(e.sourceCapabilities?.firesTouchEvents)) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      return e.sourceCapabilities.firesTouchEvents
    }

    return this._eventTimeStamp(e) < this._lastTouchEventTimeStamp + Delay.PreventFiresTouchEvents
  }

          _processEvent (event                 , callback                          )       {
    callback?.call(this._handler, event)
  }

          _makeCompatEvent (event                         , touch        )                  {
    // TouchEvent has no clientX/Y coordinates:
    // We have to use the last Touch instead
    const eventLike = touch ?? (event              )
    const box = this._target.getBoundingClientRect() ?? { left: 0, top: 0 }
    return {
      x: eventLike.clientX - box.left,
      y: eventLike.clientY - box.top,

      pageX: eventLike.pageX,
      pageY: eventLike.pageY,
      isTouch: !event.type.startsWith('mouse') && event.type !== 'contextmenu' && event.type !== 'click' && event.type !== 'wheel',

      preventDefault: () => {
        if (event.type !== 'touchstart') {
          // touchstart is passive and cannot be prevented
          this._preventDefault(event)
        }
      }
    }
  }

          _getTouchDistance (p1       , p2       )         {
    const xDiff = p1.clientX - p2.clientX
    const yDiff = p1.clientY - p2.clientY
    return Math.sqrt(xDiff * xDiff + yDiff * yDiff)
  }

          _preventDefault (event       )       {
    if (event.cancelable) {
      event.preventDefault()
    }
  }

          _getCoordinate (eventLike                    )             {
    return {
      x: eventLike.pageX,
      y: eventLike.pageY
    }
  }

          _eventTimeStamp (e                         )         {
    // for some reason e.timestamp is always 0 on iPad with magic mouse, so we use performance.now() as a fallback
    return e.timeStamp ?? performance.now()
  }

          _touchWithId (touches           , id                  )                  {
    for (let i = 0; i < touches.length; ++i) {
      if (touches[i].identifier === id) {
        return touches[i]
      }
    }
    return null
  }
}


},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => TaskScheduler });
const $mod0 = $load(79);
const requestIdleCallback = $mod0.requestIdleCallback;
const cancelIdleCallback = $mod0.cancelIdleCallback;
const DEFAULT_REQUEST_ID = $mod0.DEFAULT_REQUEST_ID;
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */








class TaskScheduler {
                   _tasks

          _requestIdleCallbackId = DEFAULT_REQUEST_ID

  constructor (tasks         ) {
    this._tasks = tasks ?? []
    this._operateTasks()
  }

          _operateTasks (fn             )       {
    if (this._requestIdleCallbackId !== DEFAULT_REQUEST_ID) {
      cancelIdleCallback(this._requestIdleCallbackId)
      this._requestIdleCallbackId = DEFAULT_REQUEST_ID
    }
    fn?.()
    this._requestIdleCallbackId = requestIdleCallback(deadline => { this._runTasks(deadline) })
  }

          _runTasks (deadline              )       {
    while (deadline.timeRemaining() > 0 && this._tasks.length > 0) {
      const task = this._tasks.shift()
      task?.handler()
    }
    if (this._tasks.length > 0) {
      this._requestIdleCallbackId = requestIdleCallback(deadline => { this._runTasks(deadline) })
    }
  }

  addTask (task      )       {
    this._operateTasks(() => {
      const index = this._tasks.findIndex(t => t.id === task.id)
      if (index > -1) {
        this._tasks[index] = task
      } else {
        this._tasks.push(task)
      }
    })
    return this
  }

  removeTask (id        )       {
    this._operateTasks(() => {
      const index = this._tasks.findIndex(t => t.id === id)
      if (index > -1) {
        this._tasks.splice(index, 1)
      }
    })
    return this
  }
}


},
function ($exports, $load) {
Object.defineProperty($exports, "UpdateLevel", { enumerable: true, get: () => UpdateLevel });

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const UpdateLevel = { Main: 0, 0: "Main", Overlay: 1, 1: "Overlay", Separator: 2, 2: "Separator", Drawer: 3, 3: "Drawer", All: 4, 4: "All" };






},
function ($exports, $load) {


/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */











},
function ($exports, $load) {
Object.defineProperty($exports, "getDefaultVisibleRange", { enumerable: true, get: () => getDefaultVisibleRange });

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */








function getDefaultVisibleRange ()               {
  return { from: 0, to: 0, realFrom: 0, realTo: 0 }
}


},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => AxisImp });
const $mod0 = $load(84);
const getPrecision = $mod0.getPrecision;
const nice = $mod0.nice;
const round = $mod0.round;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */




































class AxisImp                                                    {
                   _parent

          _range            = { from: 0, to: 0, range: 0, realFrom: 0, realTo: 0, realRange: 0 }
          _prevRange            = { from: 0, to: 0, range: 0, realFrom: 0, realTo: 0, realRange: 0 }
          _ticks             = []

          _autoCalcTickFlag = true

  constructor (parent                   ) {
    this._parent = parent
  }

  getParent ()                    { return this._parent }

  buildTicks (force         )          {
    if (this._autoCalcTickFlag) {
      this._range = this.calcRange()
    }
    if (this._prevRange.from !== this._range.from || this._prevRange.to !== this._range.to || force) {
      this._prevRange = this._range
      const defaultTicks = this.optimalTicks(this._calcTicks())
      this._ticks = this.createTicks({
        range: this._range,
        bounding: this.getSelfBounding(),
        defaultTicks
      })
      return true
    }
    return false
  }

  getTicks ()             {
    return this._ticks
  }

  getScrollZoomEnabled ()          {
    return this.getParent().getOptions().axisOptions.scrollZoomEnabled ?? true
  }

  setRange (range           )       {
    this._autoCalcTickFlag = false
    this._range = range
  }

  getRange ()            { return this._range }

  setAutoCalcTickFlag (flag         )       {
    this._autoCalcTickFlag = flag
  }

  getAutoCalcTickFlag ()          { return this._autoCalcTickFlag }

          _calcTicks ()             {
    const { realFrom, realTo, realRange } = this._range
    const ticks             = []

    if (realRange >= 0) {
      const [interval, precision] = this._calcTickInterval(realRange)
      const first = round(Math.ceil(realFrom / interval) * interval, precision)
      const last = round(Math.floor(realTo / interval) * interval, precision)
      let n = 0
      let f = first

      if (interval !== 0) {
        while (f <= last) {
          const v = f.toFixed(precision)
          ticks[n] = { text: v, coord: 0, value: v }
          ++n
          f += interval
        }
      }
    }
    return ticks
  }

          _calcTickInterval (range        )           {
    const interval = nice(range / 8.0)
    const precision = getPrecision(interval)
    return [interval, precision]
  }













}


},
function ($exports, $load) {
Object.defineProperty($exports, "DEVIATION", { enumerable: true, get: () => DEVIATION });
Object.defineProperty($exports, "default", { enumerable: true, get: () => FigureImp });
const $mod0 = $load(13);
const Eventful = $mod0.default;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */






const DEVIATION = 2

















class FigureImp                   extends Eventful                                                                 {
  attrs
  styles

  constructor (figure              ) {
    super()
    this.attrs = figure.attrs
    this.styles = figure.styles
  }

  checkEventOn (event                 )          {
    return this.checkEventOnImp(event, this.attrs, this.styles)
  }

  setAttrs (attrs   )       {
    this.attrs = attrs
    return this
  }

  setStyles (styles   )       {
    this.styles = styles
    return this
  }

  draw (ctx                          )       {
    this.drawImp(ctx, this.attrs, this.styles)
  }





  static extend       (figure                      )                                                {
    class Custom extends FigureImp       {
      checkEventOnImp (coordinate            , attrs   , styles   )          {
        return figure.checkEventOn(coordinate, attrs, styles)
      }

      drawImp (ctx                          , attrs   , styles   )       {
        figure.draw(ctx, attrs, styles)
      }
    }
    return Custom
  }
}


},
function ($exports, $load) {
Object.defineProperty($exports, "IndicatorSeries", { enumerable: true, get: () => IndicatorSeries });
Object.defineProperty($exports, "eachFigures", { enumerable: true, get: () => eachFigures });
Object.defineProperty($exports, "default", { enumerable: true, get: () => IndicatorImp });
const $mod0 = $load(81);
const formatValue = $mod0.formatValue;
const $mod2 = $load(87);
const isValid = $mod2.isValid;
const merge = $mod2.merge;
const clone = $mod2.clone;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */




















const IndicatorSeries = { Normal: 'normal', Price: 'price', Volume: 'volume' };

























































































































































































function eachFigures    (
  kLineDataList             ,
  indicator              ,
  dataIndex        ,
  defaultStyles                ,
  eachFigureCallback
)       {
  const result = indicator.result
  const figures = indicator.figures
  const styles = indicator.styles

  const circleStyles = formatValue(styles, 'circles', defaultStyles.circles)
  const circleStyleCount = circleStyles.length

  const barStyles = formatValue(styles, 'bars', defaultStyles.bars)
  const barStyleCount = barStyles.length

  const lineStyles = formatValue(styles, 'lines', defaultStyles.lines)
  const lineStyleCount = lineStyles.length

  let circleCount = 0
  let barCount = 0
  let lineCount = 0

  let defaultFigureStyles
  let figureIndex = 0
  figures.forEach(figure => {
    switch (figure.type) {
      case 'circle': {
        figureIndex = circleCount
        const styles = circleStyles[circleCount % circleStyleCount]
        defaultFigureStyles = { ...styles, color: styles.noChangeColor }
        circleCount++
        break
      }
      case 'bar': {
        figureIndex = barCount
        const styles = barStyles[barCount % barStyleCount]
        defaultFigureStyles = { ...styles, color: styles.noChangeColor }
        barCount++
        break
      }
      case 'line': {
        figureIndex = lineCount
        defaultFigureStyles = lineStyles[lineCount % lineStyleCount]
        lineCount++
        break
      }
      default: { break }
    }
    if (isValid(defaultFigureStyles)) {
      const cbData = {
        prev: { kLineData: kLineDataList[dataIndex - 1], indicatorData: result[dataIndex - 1] },
        current: { kLineData: kLineDataList[dataIndex], indicatorData: result[dataIndex] },
        next: { kLineData: kLineDataList[dataIndex + 1], indicatorData: result[dataIndex + 1] }
      }
      const ss = figure.styles?.(cbData, indicator, defaultStyles)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      eachFigureCallback(figure, { ...defaultFigureStyles, ...ss }, figureIndex)
    }
  })
}

class IndicatorImp                                  {
  name
  shortName
  precision
  calcParams
  shouldOhlc
  shouldFormatBigNumber
  visible
  zLevel
  extendData
  series
  figures
  minValue
  maxValue
  styles
  regenerateFigures
  createTooltipDataSource
  draw

  result      = []

          _precisionFlag          = false

  constructor (indicator                   ) {
    const {
      name, shortName, series, calcParams, figures, precision,
      shouldOhlc, shouldFormatBigNumber, visible, zLevel,
      minValue, maxValue, styles, extendData,
      regenerateFigures, createTooltipDataSource, draw
    } = indicator
    this.name = name
    this.shortName = shortName ?? name
    this.series = series ?? IndicatorSeries.Normal
    this.precision = precision ?? 4
    this.calcParams = calcParams ?? []
    this.figures = figures ?? []
    this.shouldOhlc = shouldOhlc ?? false
    this.shouldFormatBigNumber = shouldFormatBigNumber ?? false
    this.visible = visible ?? true
    this.zLevel = zLevel ?? 0
    this.minValue = minValue ?? null
    this.maxValue = maxValue ?? null
    this.styles = clone(styles ?? {})
    this.extendData = extendData
    this.regenerateFigures = regenerateFigures ?? null
    this.createTooltipDataSource = createTooltipDataSource ?? null
    this.draw = draw ?? null
  }

  setShortName (shortName        )          {
    if (this.shortName !== shortName) {
      this.shortName = shortName
      return true
    }
    return false
  }

  setSeries (series                 )          {
    if (this.series !== series) {
      this.series = series
      return true
    }
    return false
  }

  setPrecision (precision        , flag          )          {
    const f = flag ?? false
    const optimalPrecision = Math.floor(precision)
    if (optimalPrecision !== this.precision && precision >= 0 && (!f || (f && !this._precisionFlag))) {
      this.precision = optimalPrecision
      if (!f) {
        this._precisionFlag = true
      }
      return true
    }
    return false
  }

  setCalcParams (params       )          {
    this.calcParams = params
    this.figures = this.regenerateFigures?.(params) ?? this.figures
    return true
  }

  setShouldOhlc (shouldOhlc         )          {
    if (this.shouldOhlc !== shouldOhlc) {
      this.shouldOhlc = shouldOhlc
      return true
    }
    return false
  }

  setShouldFormatBigNumber (shouldFormatBigNumber         )          {
    if (this.shouldFormatBigNumber !== shouldFormatBigNumber) {
      this.shouldFormatBigNumber = shouldFormatBigNumber
      return true
    }
    return false
  }

  setVisible (visible         )          {
    if (this.visible !== visible) {
      this.visible = visible
      return true
    }
    return false
  }

  setZLevel (zLevel        )          {
    if (this.zLevel !== zLevel) {
      this.zLevel = zLevel
      return true
    }
    return false
  }

  setStyles (styles                         )          {
    merge(this.styles, styles)
    return true
  }

  setExtendData (extendData     )          {
    if (this.extendData !== extendData) {
      this.extendData = extendData
      return true
    }
    return false
  }

  setFigures (figures                   )          {
    if (this.figures !== figures) {
      this.figures = figures
      return true
    }
    return false
  }

  setMinValue (value                  )          {
    if (this.minValue !== value) {
      this.minValue = value
      return true
    }
    return false
  }

  setMaxValue (value                  )          {
    if (this.maxValue !== value) {
      this.maxValue = value
      return true
    }
    return false
  }

  setRegenerateFigures (callback                                              )          {
    if (this.regenerateFigures !== callback) {
      this.regenerateFigures = callback
      return true
    }
    return false
  }

  setCreateTooltipDataSource (callback                                                    )          {
    if (this.createTooltipDataSource !== callback) {
      this.createTooltipDataSource = callback
      return true
    }
    return false
  }

  setDraw (callback                                 )          {
    if (this.draw !== callback) {
      this.draw = callback
      return true
    }
    return false
  }

  async calcIndicator (dataList             )                   {
    try {
      const result = await this.calc(dataList, this)
      this.result = result
      return true
    } catch (e) {
      return false
    }
  }



  static extend    (template                   )                          {
    class Custom extends IndicatorImp    {
      constructor () {
        super(template)
      }

      calc (dataList             , indicator              )                     {
        return template.calc(dataList, indicator)
      }
    }
    return Custom
  }
}


},
function ($exports, $load) {
Object.defineProperty($exports, "OverlayMode", { enumerable: true, get: () => OverlayMode });
Object.defineProperty($exports, "getAllOverlayFigureIgnoreEventTypes", { enumerable: true, get: () => getAllOverlayFigureIgnoreEventTypes });
Object.defineProperty($exports, "OVERLAY_ID_PREFIX", { enumerable: true, get: () => OVERLAY_ID_PREFIX });
Object.defineProperty($exports, "OVERLAY_FIGURE_KEY_PREFIX", { enumerable: true, get: () => OVERLAY_FIGURE_KEY_PREFIX });
Object.defineProperty($exports, "default", { enumerable: true, get: () => OverlayImp });
const $mod0 = $load(87);
const clone = $mod0.clone;
const isNumber = $mod0.isNumber;
const isString = $mod0.isString;
const merge = $mod0.merge;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


















const OverlayMode = { Normal: 'normal', WeakMagnet: 'weak_magnet', StrongMagnet: 'strong_magnet' };











function getAllOverlayFigureIgnoreEventTypes ()                                 {
  return [
    'mouseClickEvent',
    'mouseDoubleClickEvent',
    'mouseRightClickEvent',
    'tapEvent',
    'doubleTapEvent',
    'mouseDownEvent',
    'touchStartEvent',
    'mouseMoveEvent',
    'touchMoveEvent'
  ]
}





































































































































































































































const OVERLAY_DRAW_STEP_START = 1
const OVERLAY_DRAW_STEP_FINISHED = -1

const OVERLAY_ID_PREFIX = 'overlay_'

const OVERLAY_FIGURE_KEY_PREFIX = 'overlay_figure_'

class OverlayImp                    {
  id
  groupId
  paneId
  name
  totalStep
  currentStep         = OVERLAY_DRAW_STEP_START
  needDefaultPointFigure
  needDefaultXAxisFigure
  needDefaultYAxisFigure
  lock
  visible
  zLevel
  mode
  modeSensitivity
  points                        = []
  extendData
  styles
  createPointFigures
  createXAxisFigures
  createYAxisFigures
  performEventPressedMove
  performEventMoveForDrawing
  onDrawStart
  onDrawing
  onDrawEnd
  onClick
  onDoubleClick
  onRightClick
  onPressedMoveStart
  onPressedMoving
  onPressedMoveEnd
  onMouseEnter
  onMouseLeave
  onRemoved
  onSelected
  onDeselected

          _prevPressedPoint                           = null
          _prevPressedPoints                        = []

  constructor (overlay                 ) {
    const {
      mode, modeSensitivity, extendData, styles,
      name, totalStep, lock, visible, zLevel,
      needDefaultPointFigure, needDefaultXAxisFigure, needDefaultYAxisFigure,
      createPointFigures, createXAxisFigures, createYAxisFigures,
      performEventPressedMove, performEventMoveForDrawing,
      onDrawStart, onDrawing, onDrawEnd,
      onClick, onDoubleClick, onRightClick,
      onPressedMoveStart, onPressedMoving, onPressedMoveEnd,
      onMouseEnter, onMouseLeave, onRemoved,
      onSelected, onDeselected
    } = overlay
    this.name = name
    this.totalStep = (!isNumber(totalStep) || totalStep < 2) ? 1 : totalStep
    this.lock = lock ?? false
    this.visible = visible ?? true
    this.zLevel = zLevel ?? 0
    this.needDefaultPointFigure = needDefaultPointFigure ?? false
    this.needDefaultXAxisFigure = needDefaultXAxisFigure ?? false
    this.needDefaultYAxisFigure = needDefaultYAxisFigure ?? false
    this.mode = mode ?? OverlayMode.Normal
    this.modeSensitivity = modeSensitivity ?? 8
    this.extendData = extendData
    this.styles = clone(styles ?? {})
    this.createPointFigures = createPointFigures ?? null
    this.createXAxisFigures = createXAxisFigures ?? null
    this.createYAxisFigures = createYAxisFigures ?? null
    this.performEventPressedMove = performEventPressedMove ?? null
    this.performEventMoveForDrawing = performEventMoveForDrawing ?? null
    this.onDrawStart = onDrawStart ?? null
    this.onDrawing = onDrawing ?? null
    this.onDrawEnd = onDrawEnd ?? null
    this.onClick = onClick ?? null
    this.onDoubleClick = onDoubleClick ?? null
    this.onRightClick = onRightClick ?? null
    this.onPressedMoveStart = onPressedMoveStart ?? null
    this.onPressedMoving = onPressedMoving ?? null
    this.onPressedMoveEnd = onPressedMoveEnd ?? null
    this.onMouseEnter = onMouseEnter ?? null
    this.onMouseLeave = onMouseLeave ?? null
    this.onRemoved = onRemoved ?? null
    this.onSelected = onSelected ?? null
    this.onDeselected = onDeselected ?? null
  }

  setId (id        )          {
    if (!isString(this.id)) {
      this.id = id
      return true
    }
    return false
  }

  setGroupId (groupId        )          {
    if (!isString(this.groupId)) {
      this.groupId = groupId
      return true
    }
    return false
  }

  setPaneId (paneId        )       {
    this.paneId = paneId
  }

  setExtendData (extendData     )          {
    if (extendData !== this.extendData) {
      this.extendData = extendData
      return true
    }
    return false
  }

  setStyles (styles                           )          {
    merge(this.styles, styles)
    return true
  }

  setPoints (points                       )          {
    if (points.length > 0) {
      let repeatTotalStep
      this.points = [...points]
      if (points.length >= this.totalStep - 1) {
        this.currentStep = OVERLAY_DRAW_STEP_FINISHED
        repeatTotalStep = this.totalStep - 1
      } else {
        this.currentStep = points.length + 1
        repeatTotalStep = points.length
      }
      // Prevent wrong drawing due to wrong points
      if (this.performEventMoveForDrawing !== null) {
        for (let i = 0; i < repeatTotalStep; i++) {
          this.performEventMoveForDrawing({
            currentStep: i + 2,
            mode: this.mode,
            points: this.points,
            performPointIndex: i,
            performPoint: this.points[i]
          })
        }
      }
      if (this.currentStep === OVERLAY_DRAW_STEP_FINISHED && this.performEventPressedMove !== null) {
        this.performEventPressedMove({
          currentStep: this.currentStep,
          mode: this.mode,
          points: this.points,
          performPointIndex: this.points.length - 1,
          performPoint: this.points[this.points.length - 1]
        })
      }
      return true
    }
    return false
  }

  setLock (lock         )          {
    if (this.lock !== lock) {
      this.lock = lock
      return true
    }
    return false
  }

  setVisible (visible         )          {
    if (this.visible !== visible) {
      this.visible = visible
      return true
    }
    return false
  }

  setZLevel (zLevel        )          {
    if (this.zLevel !== zLevel) {
      this.zLevel = zLevel
      return true
    }
    return false
  }

  setMode (mode             )          {
    if (this.mode !== mode) {
      this.mode = mode
      return true
    }
    return false
  }

  setModeSensitivity (modeSensitivity        )          {
    if (this.modeSensitivity !== modeSensitivity) {
      this.modeSensitivity = modeSensitivity
      return true
    }
    return false
  }

  setOnDrawStartCallback (callback                                )          {
    if (this.onDrawStart !== callback) {
      this.onDrawStart = callback
      return true
    }
    return false
  }

  setOnDrawingCallback (callback                                )          {
    if (this.onDrawing !== callback) {
      this.onDrawing = callback
      return true
    }
    return false
  }

  setOnDrawEndCallback (callback                                )          {
    if (this.onDrawEnd !== callback) {
      this.onDrawEnd = callback
      return true
    }
    return false
  }

  setOnClickCallback (callback                                )          {
    if (this.onClick !== callback) {
      this.onClick = callback
      return true
    }
    return false
  }

  setOnDoubleClickCallback (callback                                )          {
    if (this.onDoubleClick !== callback) {
      this.onDoubleClick = callback
      return true
    }
    return false
  }

  setOnRightClickCallback (callback                                )          {
    if (this.onRightClick !== callback) {
      this.onRightClick = callback
      return true
    }
    return false
  }

  setOnPressedMoveStartCallback (callback                                )          {
    if (this.onPressedMoveStart !== callback) {
      this.onPressedMoveStart = callback
      return true
    }
    return false
  }

  setOnPressedMovingCallback (callback                                )          {
    if (this.onPressedMoving !== callback) {
      this.onPressedMoving = callback
      return true
    }
    return false
  }

  setOnPressedMoveEndCallback (callback                                )          {
    if (this.onPressedMoveEnd !== callback) {
      this.onPressedMoveEnd = callback
      return true
    }
    return false
  }

  setOnMouseEnterCallback (callback                                )          {
    if (this.onMouseEnter !== callback) {
      this.onMouseEnter = callback
      return true
    }
    return false
  }

  setOnMouseLeaveCallback (callback                                )          {
    if (this.onMouseLeave !== callback) {
      this.onMouseLeave = callback
      return true
    }
    return false
  }

  setOnRemovedCallback (callback                                )          {
    if (this.onRemoved !== callback) {
      this.onRemoved = callback
      return true
    }
    return false
  }

  setOnSelectedCallback (callback                                )          {
    if (this.onSelected !== callback) {
      this.onSelected = callback
      return true
    }
    return false
  }

  setOnDeselectedCallback (callback                                )          {
    if (this.onDeselected !== callback) {
      this.onDeselected = callback
      return true
    }
    return false
  }

  nextStep ()       {
    if (this.currentStep === this.totalStep - 1) {
      this.currentStep = OVERLAY_DRAW_STEP_FINISHED
    } else {
      this.currentStep++
    }
  }

  forceComplete ()       {
    this.currentStep = OVERLAY_DRAW_STEP_FINISHED
  }

  isDrawing ()          {
    return this.currentStep !== OVERLAY_DRAW_STEP_FINISHED
  }

  isStart ()          {
    return this.currentStep === OVERLAY_DRAW_STEP_START
  }

  eventMoveForDrawing (point                )       {
    const pointIndex = this.currentStep - 1
    const newPoint                 = {}
    if (isNumber(point.timestamp)) {
      newPoint.timestamp = point.timestamp
    }
    if (isNumber(point.dataIndex)) {
      newPoint.dataIndex = point.dataIndex
    }
    if (isNumber(point.value)) {
      newPoint.value = point.value
    }
    this.points[pointIndex] = newPoint
    this.performEventMoveForDrawing?.({
      currentStep: this.currentStep,
      mode: this.mode,
      points: this.points,
      performPointIndex: pointIndex,
      performPoint: newPoint
    })
  }

  eventPressedPointMove (point                , pointIndex        )       {
    if (isNumber(point.dataIndex)) {
      this.points[pointIndex].dataIndex = point.dataIndex
      this.points[pointIndex].timestamp = point.timestamp
    }
    if (isNumber(point.value)) {
      this.points[pointIndex].value = point.value
    }
    this.performEventPressedMove?.({
      currentStep: this.currentStep,
      points: this.points,
      mode: this.mode,
      performPointIndex: pointIndex,
      performPoint: this.points[pointIndex]
    })
  }

  startPressedMove (point                )       {
    this._prevPressedPoint = { ...point }
    this._prevPressedPoints = clone(this.points)
  }

  eventPressedOtherMove (point                , timeScaleStore                )       {
    if (this._prevPressedPoint !== null) {
      let difDataIndex
      if (isNumber(point.dataIndex) && isNumber(this._prevPressedPoint.dataIndex)) {
        difDataIndex = point.dataIndex - this._prevPressedPoint.dataIndex
      }
      let difValue
      if (isNumber(point.value) && isNumber(this._prevPressedPoint.value)) {
        difValue = point.value - this._prevPressedPoint.value
      }
      this.points = this._prevPressedPoints.map(p => {
        if (isNumber(p.timestamp)) {
          p.dataIndex = timeScaleStore.timestampToDataIndex(p.timestamp)
        }
        const newPoint = { ...p }
        if (isNumber(difDataIndex) && isNumber(p.dataIndex)) {
          newPoint.dataIndex = p.dataIndex + difDataIndex
          newPoint.timestamp = timeScaleStore.dataIndexToTimestamp(newPoint.dataIndex) ?? undefined
        }
        if (isNumber(difValue) && isNumber(p.value)) {
          newPoint.value = p.value + difValue
        }
        return newPoint
      })
    }
  }

  static extend (template                 )                          {
    class Custom extends OverlayImp {
      constructor () {
        super(template)
      }
    }
    return Custom
  }
}


},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => XAxisImp });
const $mod0 = $load(77);
const calcTextWidth = $mod0.calcTextWidth;
const $mod2 = $load(87);
const isValid = $mod2.isValid;
const $mod4 = $load(3);
const FormatDateType = $mod4.FormatDateType;
const $mod6 = $load(29);
const AxisImp = $mod6.default;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
















class XAxisImp extends AxisImp {
            calcRange ()            {
    const chartStore = this.getParent().getChart().getChartStore()
    const { from, to } = chartStore.getTimeScaleStore().getVisibleRange()
    const af = from
    const at = to - 1
    const range = to - from
    return {
      from: af, to: at, range, realFrom: af, realTo: at, realRange: range
    }
  }

            optimalTicks (ticks            )             {
    const chart = this.getParent().getChart()
    const chartStore = chart.getChartStore()
    const formatDate = chartStore.getCustomApi().formatDate
    const optimalTicks             = []
    const tickLength = ticks.length
    const dataList = chartStore.getDataList()
    if (tickLength > 0) {
      const dateTimeFormat = chartStore.getTimeScaleStore().getDateTimeFormat()
      const tickTextStyles = chart.getStyles().xAxis.tickText
      const defaultLabelWidth = calcTextWidth('00-00 00:00', tickTextStyles.size, tickTextStyles.weight, tickTextStyles.family)
      const pos = parseInt(ticks[0].value          , 10)
      const x = this.convertToPixel(pos)
      let tickCountDif = 1
      if (tickLength > 1) {
        const nextPos = parseInt(ticks[1].value          , 10)
        const nextX = this.convertToPixel(nextPos)
        const xDif = Math.abs(nextX - x)
        if (xDif < defaultLabelWidth) {
          tickCountDif = Math.ceil(defaultLabelWidth / xDif)
        }
      }
      for (let i = 0; i < tickLength; i += tickCountDif) {
        const pos = parseInt(ticks[i].value          , 10)
        const kLineData = dataList[pos]
        const timestamp = kLineData.timestamp
        let text = formatDate(dateTimeFormat, timestamp, 'HH:mm', FormatDateType.XAxis)
        if (i !== 0) {
          const prevPos = parseInt(ticks[i - tickCountDif].value          , 10)
          const prevKLineData = dataList[prevPos]
          const prevTimestamp = prevKLineData.timestamp
          text = this._optimalTickLabel(formatDate, dateTimeFormat, timestamp, prevTimestamp) ?? text
        }
        const x = this.convertToPixel(pos)
        optimalTicks.push({ text, coord: x, value: timestamp })
      }
      const optimalTickLength = optimalTicks.length
      if (optimalTickLength === 1) {
        optimalTicks[0].text = formatDate(dateTimeFormat, optimalTicks[0].value          , 'YYYY-MM-DD HH:mm', FormatDateType.XAxis)
      } else {
        const firstTimestamp = optimalTicks[0].value
        const secondTimestamp = optimalTicks[1].value
        if (isValid(optimalTicks[2])) {
          const thirdText = optimalTicks[2].text
          if (/^[0-9]{2}-[0-9]{2}$/.test(thirdText)) {
            optimalTicks[0].text = formatDate(dateTimeFormat, firstTimestamp, 'MM-DD', FormatDateType.XAxis)
          } else if (/^[0-9]{4}-[0-9]{2}$/.test(thirdText)) {
            optimalTicks[0].text = formatDate(dateTimeFormat, firstTimestamp, 'YYYY-MM', FormatDateType.XAxis)
          } else if (/^[0-9]{4}$/.test(thirdText)) {
            optimalTicks[0].text = formatDate(dateTimeFormat, firstTimestamp, 'YYYY', FormatDateType.XAxis)
          }
        } else {
          optimalTicks[0].text = this._optimalTickLabel(formatDate, dateTimeFormat, firstTimestamp, secondTimestamp) ?? optimalTicks[0].text
        }
      }
    }
    return optimalTicks
  }

          _optimalTickLabel (formatDate            , dateTimeFormat                     , timestamp        , comparedTimestamp        )                   {
    const year = formatDate(dateTimeFormat, timestamp, 'YYYY', FormatDateType.XAxis)
    const month = formatDate(dateTimeFormat, timestamp, 'YYYY-MM', FormatDateType.XAxis)
    const day = formatDate(dateTimeFormat, timestamp, 'MM-DD', FormatDateType.XAxis)
    if (year !== formatDate(dateTimeFormat, comparedTimestamp, 'YYYY', FormatDateType.XAxis)) {
      return year
    } else if (month !== formatDate(dateTimeFormat, comparedTimestamp, 'YYYY-MM', FormatDateType.XAxis)) {
      return month
    } else if (day !== formatDate(dateTimeFormat, comparedTimestamp, 'MM-DD', FormatDateType.XAxis)) {
      return day
    }
    return null
  }

           getAutoSize ()         {
    const styles = this.getParent().getChart().getStyles()
    const xAxisStyles = styles.xAxis
    const height = xAxisStyles.size
    if (height !== 'auto') {
      return height
    }
    const crosshairStyles = styles.crosshair
    let xAxisHeight = 0
    if (xAxisStyles.show) {
      if (xAxisStyles.axisLine.show) {
        xAxisHeight += xAxisStyles.axisLine.size
      }
      if (xAxisStyles.tickLine.show) {
        xAxisHeight += xAxisStyles.tickLine.length
      }
      if (xAxisStyles.tickText.show) {
        xAxisHeight += (xAxisStyles.tickText.marginStart + xAxisStyles.tickText.marginEnd + xAxisStyles.tickText.size)
      }
    }
    let crosshairVerticalTextHeight = 0
    if (
      crosshairStyles.show &&
      crosshairStyles.vertical.show &&
      crosshairStyles.vertical.text.show
    ) {
      crosshairVerticalTextHeight += (
        crosshairStyles.vertical.text.paddingTop +
        crosshairStyles.vertical.text.paddingBottom +
        crosshairStyles.vertical.text.borderSize * 2 +
        crosshairStyles.vertical.text.size
      )
    }
    return Math.max(xAxisHeight, crosshairVerticalTextHeight)
  }

  getSelfBounding ()           {
    return this.getParent().getMainWidget().getBounding()
  }

  convertTimestampFromPixel (pixel        )                   {
    const timeScaleStore = this.getParent().getChart().getChartStore().getTimeScaleStore()
    const dataIndex = timeScaleStore.coordinateToDataIndex(pixel)
    return timeScaleStore.dataIndexToTimestamp(dataIndex)
  }

  convertTimestampToPixel (timestamp        )         {
    const timeScaleStore = this.getParent().getChart().getChartStore().getTimeScaleStore()
    const dataIndex = timeScaleStore.timestampToDataIndex(timestamp)
    return timeScaleStore.dataIndexToCoordinate(dataIndex)
  }

  convertFromPixel (pixel        )         {
    return this.getParent().getChart().getChartStore().getTimeScaleStore().coordinateToDataIndex(pixel)
  }

  convertToPixel (value        )         {
    return this.getParent().getChart().getChartStore().getTimeScaleStore().dataIndexToCoordinate(value)
  }

  static extend (template              )                   {
    class Custom extends XAxisImp {
      createTicks (params                       )             {
        return template.createTicks(params)
      }
    }
    return Custom
  }
}


},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => YAxisImp });
const $mod0 = $load(23);
const YAxisType = $mod0.YAxisType;
const YAxisPosition = $mod0.YAxisPosition;
const CandleType = $mod0.CandleType;
const $mod4 = $load(87);
const isNumber = $mod4.isNumber;
const isValid = $mod4.isValid;
const $mod7 = $load(84);
const index10 = $mod7.index10;
const log10 = $mod7.log10;
const $mod10 = $load(77);
const calcTextWidth = $mod10.calcTextWidth;
const $mod12 = $load(81);
const formatPrecision = $mod12.formatPrecision;
const formatThousands = $mod12.formatThousands;
const formatFoldDecimal = $mod12.formatFoldDecimal;
const $mod16 = $load(29);
const AxisImp = $mod16.default;
const $mod18 = $load(40);
const PaneIdConstants = $mod18.PaneIdConstants;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */




























class YAxisImp extends AxisImp                  {
            calcRange ()            {
    const parent = this.getParent()
    const chart = parent.getChart()
    const chartStore = chart.getChartStore()
    let min = Number.MAX_SAFE_INTEGER
    let max = Number.MIN_SAFE_INTEGER
    const figuresResultList                  = []
    let shouldOhlc = false
    let specifyMin = Number.MAX_SAFE_INTEGER
    let specifyMax = Number.MIN_SAFE_INTEGER
    let indicatorPrecision = Number.MAX_SAFE_INTEGER
    const indicators = chartStore.getIndicatorStore().getInstances(parent.getId())
    indicators.forEach(indicator => {
      if (!shouldOhlc) {
        shouldOhlc = indicator.shouldOhlc ?? false
      }
      indicatorPrecision = Math.min(indicatorPrecision, indicator.precision)
      if (isNumber(indicator.minValue)) {
        specifyMin = Math.min(specifyMin, indicator.minValue)
      }
      if (isNumber(indicator.maxValue)) {
        specifyMax = Math.max(specifyMax, indicator.maxValue)
      }
      figuresResultList.push({
        figures: indicator.figures ?? [],
        result: indicator.result ?? []
      })
    })

    let precision = 4
    const inCandle = this.isInCandle()
    if (inCandle) {
      const { price: pricePrecision } = chartStore.getPrecision()
      if (indicatorPrecision !== Number.MAX_SAFE_INTEGER) {
        precision = Math.min(indicatorPrecision, pricePrecision)
      } else {
        precision = pricePrecision
      }
    } else {
      if (indicatorPrecision !== Number.MAX_SAFE_INTEGER) {
        precision = indicatorPrecision
      }
    }
    const visibleDataList = chartStore.getVisibleDataList()
    const candleStyles = chart.getStyles().candle
    const isArea = candleStyles.type === CandleType.Area
    const areaValueKey = candleStyles.area.value
    const shouldCompareHighLow = (inCandle && !isArea) || (!inCandle && shouldOhlc)
    visibleDataList.forEach(({ dataIndex, data }) => {
      if (isValid(data)) {
        if (shouldCompareHighLow) {
          min = Math.min(min, data.low)
          max = Math.max(max, data.high)
        }
        if (inCandle && isArea) {
          const value = data[areaValueKey]
          if (isNumber(value)) {
            min = Math.min(min, value)
            max = Math.max(max, value)
          }
        }
      }
      figuresResultList.forEach(({ figures, result }) => {
        const indicatorData = result[dataIndex] ?? {}
        figures.forEach(figure => {
          const value = indicatorData[figure.key]
          if (isNumber(value)) {
            min = Math.min(min, value)
            max = Math.max(max, value)
          }
        })
      })
    })

    if (min !== Number.MAX_SAFE_INTEGER && max !== Number.MIN_SAFE_INTEGER) {
      min = Math.min(specifyMin, min)
      max = Math.max(specifyMax, max)
    } else {
      min = 0
      max = 10
    }

    const type = this.getType()
    let dif
    switch (type) {
      case YAxisType.Percentage: {
        const fromData = chartStore.getVisibleFirstData()
        if (isValid(fromData) && isNumber(fromData.close)) {
          min = (min - fromData.close) / fromData.close * 100
          max = (max - fromData.close) / fromData.close * 100
        }
        dif = Math.pow(10, -2)
        break
      }
      case YAxisType.Log: {
        min = log10(min)
        max = log10(max)
        dif = 0.05 * index10(-precision)
        break
      }
      default: {
        dif = index10(-precision)
      }
    }
    if (
      min === max ||
      Math.abs(min - max) < dif
    ) {
      const minCheck = specifyMin === min
      const maxCheck = specifyMax === max
      min = minCheck ? min : (maxCheck ? min - 8 * dif : min - 4 * dif)
      max = maxCheck ? max : (minCheck ? max + 8 * dif : max + 4 * dif)
    }

    const height = this.getParent().getYAxisWidget()?.getBounding().height ?? 0
    const { gap: paneGap } = parent.getOptions()
    let topRate = paneGap?.top ?? 0.2
    if (topRate >= 1) {
      topRate = topRate / height
    }
    let bottomRate = paneGap?.bottom ?? 0.1
    if (bottomRate >= 1) {
      bottomRate = bottomRate / height
    }
    let range = Math.abs(max - min)
    // gap
    min = min - range * bottomRate
    max = max + range * topRate
    range = Math.abs(max - min)
    let realMin
    let realMax
    let realRange
    if (type === YAxisType.Log) {
      realMin = index10(min)
      realMax = index10(max)
      realRange = Math.abs(realMax - realMin)
    } else {
      realMin = min
      realMax = max
      realRange = range
    }

    return {
      from: min, to: max, range, realFrom: realMin, realTo: realMax, realRange
    }
  }

  /**
   * 内部值转换成坐标
   * @param value
   * @return {number}
   * @private
   */
  _innerConvertToPixel (value        )         {
    const height = this.getParent().getYAxisWidget()?.getBounding().height ?? 0
    const { from, range } = this.getRange()
    const rate = (value - from) / range
    return this.isReverse() ? Math.round(rate * height) : Math.round((1 - rate) * height)
  }

  /**
   * 是否是蜡烛图轴
   * @return {boolean}
   */
  isInCandle ()          {
    return this.getParent().getId() === PaneIdConstants.CANDLE
  }

  /**
   * y轴类型
   * @return {YAxisType}
   */
  getType ()            {
    if (this.isInCandle()) {
      return this.getParent().getChart().getStyles().yAxis.type
    }
    return YAxisType.Normal
  }

  getPosition ()         {
    return this.getParent().getChart().getStyles().yAxis.position
  }

  /**
   * 是否反转
   * @return {boolean}
   */
  isReverse ()          {
    if (this.isInCandle()) {
      return this.getParent().getChart().getStyles().yAxis.reverse
    }
    return false
  }

  /**
   * 是否从y轴0开始
   * @return {boolean}
   */
  isFromZero ()          {
    const yAxisStyles = this.getParent().getChart().getStyles().yAxis
    const inside = yAxisStyles.inside
    return (
      (yAxisStyles.position === YAxisPosition.Left && inside) ||
      (yAxisStyles.position === YAxisPosition.Right && !inside)
    )
  }

            optimalTicks (ticks            )             {
    const pane = this.getParent()
    const height = pane.getYAxisWidget()?.getBounding().height ?? 0
    const chartStore = pane.getChart().getChartStore()
    const customApi = chartStore.getCustomApi()
    const optimalTicks             = []
    const type = this.getType()
    const indicators = chartStore.getIndicatorStore().getInstances(pane.getId())
    const thousandsSeparator = chartStore.getThousandsSeparator()
    const decimalFoldThreshold = chartStore.getDecimalFoldThreshold()
    let precision = 0
    let shouldFormatBigNumber = false
    if (this.isInCandle()) {
      precision = chartStore.getPrecision().price
    } else {
      indicators.forEach(tech => {
        precision = Math.max(precision, tech.precision)
        if (!shouldFormatBigNumber) {
          shouldFormatBigNumber = tech.shouldFormatBigNumber
        }
      })
    }
    const textHeight = chartStore.getStyles().xAxis.tickText.size
    let validY
    ticks.forEach(({ value }) => {
      let v
      let y = this._innerConvertToPixel(+value)
      switch (type) {
        case YAxisType.Percentage: {
          v = `${formatPrecision(value, 2)}%`
          break
        }
        case YAxisType.Log: {
          y = this._innerConvertToPixel(log10(+value))
          v = formatPrecision(value, precision)
          break
        }
        default: {
          v = formatPrecision(value, precision)
          if (shouldFormatBigNumber) {
            v = customApi.formatBigNumber(value)
          }
          break
        }
      }
      v = formatFoldDecimal(formatThousands(v, thousandsSeparator), decimalFoldThreshold)
      const validYNumber = isNumber(validY)
      if (
        y > textHeight &&
        y < height - textHeight &&
        ((validYNumber && (Math.abs(validY - y) > textHeight * 2)) || !validYNumber)) {
        optimalTicks.push({ text: v, coord: y, value })
        validY = y
      }
    })
    return optimalTicks
  }

           getAutoSize ()         {
    const pane = this.getParent()
    const chart = pane.getChart()
    const styles = chart.getStyles()
    const yAxisStyles = styles.yAxis
    const width = yAxisStyles.size
    if (width !== 'auto') {
      return width
    }
    const chartStore = chart.getChartStore()
    const customApi = chartStore.getCustomApi()
    let yAxisWidth = 0
    if (yAxisStyles.show) {
      if (yAxisStyles.axisLine.show) {
        yAxisWidth += yAxisStyles.axisLine.size
      }
      if (yAxisStyles.tickLine.show) {
        yAxisWidth += yAxisStyles.tickLine.length
      }
      if (yAxisStyles.tickText.show) {
        let textWidth = 0
        this.getTicks().forEach(tick => {
          textWidth = Math.max(textWidth, calcTextWidth(tick.text, yAxisStyles.tickText.size, yAxisStyles.tickText.weight, yAxisStyles.tickText.family))
        })
        yAxisWidth += (yAxisStyles.tickText.marginStart + yAxisStyles.tickText.marginEnd + textWidth)
      }
    }
    const crosshairStyles = styles.crosshair
    let crosshairVerticalTextWidth = 0
    if (
      crosshairStyles.show &&
      crosshairStyles.horizontal.show &&
      crosshairStyles.horizontal.text.show
    ) {
      const indicators = chartStore.getIndicatorStore().getInstances(pane.getId())
      let techPrecision = 0
      let shouldFormatBigNumber = false
      indicators.forEach(tech => {
        techPrecision = Math.max(tech.precision, techPrecision)
        if (!shouldFormatBigNumber) {
          shouldFormatBigNumber = tech.shouldFormatBigNumber
        }
      })
      let precision = 2
      if (this.getType() !== YAxisType.Percentage) {
        if (this.isInCandle()) {
          const { price: pricePrecision } = chartStore.getPrecision()
          const lastValueMarkStyles = styles.indicator.lastValueMark
          if (lastValueMarkStyles.show && lastValueMarkStyles.text.show) {
            precision = Math.max(techPrecision, pricePrecision)
          } else {
            precision = pricePrecision
          }
        } else {
          precision = techPrecision
        }
      }
      let valueText = formatPrecision(this.getRange().to, precision)
      if (shouldFormatBigNumber) {
        valueText = customApi.formatBigNumber(valueText)
      }
      valueText = formatFoldDecimal(valueText, chartStore.getDecimalFoldThreshold())
      crosshairVerticalTextWidth += (
        crosshairStyles.horizontal.text.paddingLeft +
        crosshairStyles.horizontal.text.paddingRight +
        crosshairStyles.horizontal.text.borderSize * 2 +
        calcTextWidth(
          valueText,
          crosshairStyles.horizontal.text.size,
          crosshairStyles.horizontal.text.weight,
          crosshairStyles.horizontal.text.family
        )
      )
    }
    return Math.max(yAxisWidth, crosshairVerticalTextWidth)
  }

  getSelfBounding ()           {
    return this.getParent().getYAxisWidget() .getBounding()
  }

  convertFromPixel (pixel        )         {
    const height = this.getParent().getYAxisWidget()?.getBounding().height ?? 0
    const { from, range } = this.getRange()
    const rate = this.isReverse() ? pixel / height : 1 - pixel / height
    const value = rate * range + from
    switch (this.getType()) {
      case YAxisType.Percentage: {
        const fromData = this.getParent().getChart().getChartStore().getVisibleFirstData()
        if (isValid(fromData) && isNumber(fromData.close)) {
          return fromData.close * value / 100 + fromData.close
        }
        return 0
      }
      case YAxisType.Log: {
        return index10(value)
      }
      default: {
        return value
      }
    }
  }

  convertToRealValue (value        )         {
    let v = value
    if (this.getType() === YAxisType.Log) {
      v = index10(value)
    }
    return v
  }

  convertToPixel (value        )         {
    let v = value
    switch (this.getType()) {
      case YAxisType.Percentage: {
        const fromData = this.getParent().getChart().getChartStore().getVisibleFirstData()
        if (isValid(fromData) && isNumber(fromData.close)) {
          v = (value - fromData.close) / fromData.close * 100
        }
        break
      }
      case YAxisType.Log: {
        v = log10(value)
        break
      }
      default: {
        v = value
      }
    }
    return this._innerConvertToPixel(v)
  }

  convertToNicePixel (value        )         {
    const height = this.getParent().getYAxisWidget()?.getBounding().height ?? 0
    const pixel = this.convertToPixel(value)
    return Math.round(Math.max(height * 0.05, Math.min(pixel, height * 0.98)))
  }

  static extend (template              )                   {
    class Custom extends YAxisImp {
      createTicks (params                       )             {
        return template.createTicks(params)
      }
    }
    return Custom
  }
}


},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => CandlePane });
const $mod0 = $load(69);
const CandleWidget = $mod0.default;
const $mod2 = $load(37);
const IndicatorPane = $mod2.default;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */








class CandlePane extends IndicatorPane {
           createMainWidget (container             )                              {
    return new CandleWidget(container, this)
  }
}


},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => DrawPane });
const $mod0 = $load(87);
const isString = $mod0.isString;
const isValid = $mod0.isValid;
const merge = $mod0.merge;
const $mod4 = $load(38);
const Pane = $mod4.default;
const $mod6 = $load(40);
const PANE_MIN_HEIGHT = $mod6.PANE_MIN_HEIGHT;
const PaneIdConstants = $mod6.PaneIdConstants;
const $mod9 = $load(80);
const createDom = $mod9.createDom;
const $mod11 = $load(77);
const getPixelRatio = $mod11.getPixelRatio;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */






















class DrawPane                        extends Pane {
                   _mainWidget
                   _yAxisWidget                        = null

          _axis

                   _options                                                                            = { minHeight: PANE_MIN_HEIGHT, dragEnabled: true, gap: { top: 0.2, bottom: 0.1 }, axisOptions: { name: 'default', scrollZoomEnabled: true } }

  constructor (rootContainer             , afterElement                       , chart       , id        , options                                    ) {
    super(rootContainer, afterElement, chart, id)
    const container = this.getContainer()
    this._mainWidget = this.createMainWidget(container)
    this._yAxisWidget = this.createYAxisWidget(container)
    this.setOptions(options)
  }

  setOptions (options                                    )       {
    const name = options.axisOptions?.name
    if (
      (this._options.axisOptions.name !== name && isString(name)) ||
      !isValid(this._axis)
    ) {
      this._axis = this.createAxisComponent(name ?? 'default')
    }
    merge(this._options, options)
    let container
    let cursor
    if (this.getId() === PaneIdConstants.X_AXIS) {
      container = this.getMainWidget().getContainer()
      cursor = 'ew-resize'
    } else {
      container = this.getYAxisWidget() .getContainer()
      cursor = 'ns-resize'
    }
    if (options.axisOptions?.scrollZoomEnabled ?? true) {
      container.style.cursor = cursor
    } else {
      container.style.cursor = 'default'
    }
    return this
  }

  getOptions ()                                                                            { return this._options }

  getAxisComponent ()    {
    return this._axis
  }

           setBounding (rootBounding                   , mainBounding                    , yAxisBounding                    )       {
    merge(this.getBounding(), rootBounding)
    const contentBounding                    = {}
    if (isValid(rootBounding.height)) {
      contentBounding.height = rootBounding.height
    }
    if (isValid(rootBounding.top)) {
      contentBounding.top = rootBounding.top
    }
    this._mainWidget.setBounding(contentBounding)
    this._yAxisWidget?.setBounding(contentBounding)
    if (isValid(mainBounding)) {
      this._mainWidget.setBounding(mainBounding)
    }
    if (isValid(yAxisBounding)) {
      this._yAxisWidget?.setBounding(yAxisBounding)
    }
    return this
  }

  getMainWidget ()                          { return this._mainWidget }

  getYAxisWidget ()                        { return this._yAxisWidget }

           updateImp (level             )       {
    this._mainWidget.update(level)
    this._yAxisWidget?.update(level)
  }

  destroy ()       {
    super.destroy()
    this._mainWidget.destroy()
    this._yAxisWidget?.destroy()
  }

           getImage (includeOverlay         )                    {
    const { width, height } = this.getBounding()
    const canvas = createDom('canvas', {
      width: `${width}px`,
      height: `${height}px`,
      boxSizing: 'border-box'
    })
    const ctx = canvas.getContext('2d')
    const pixelRatio = getPixelRatio(canvas)
    canvas.width = width * pixelRatio
    canvas.height = height * pixelRatio
    ctx.scale(pixelRatio, pixelRatio)

    const mainBounding = this._mainWidget.getBounding()
    ctx.drawImage(
      this._mainWidget.getImage(includeOverlay),
      mainBounding.left, 0,
      mainBounding.width, mainBounding.height
    )
    if (this._yAxisWidget !== null) {
      const yAxisBounding = this._yAxisWidget.getBounding()
      ctx.drawImage(
        this._yAxisWidget.getImage(includeOverlay),
        yAxisBounding.left, 0,
        yAxisBounding.width, yAxisBounding.height
      )
    }
    return canvas
  }



            createYAxisWidget (_container             )                        { return null }


}


},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => IndicatorPane });
const $mod0 = $load(71);
const IndicatorWidget = $mod0.default;
const $mod2 = $load(76);
const YAxisWidget = $mod2.default;
const $mod4 = $load(149);
const getYAxisClass = $mod4.getYAxisClass;
const $mod6 = $load(36);
const DrawPane = $mod6.default;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */













class IndicatorPane extends DrawPane        {
           createAxisComponent (name         )        {
    const YAxisClass = getYAxisClass(name ?? 'default')
    return new YAxisClass(this)
  }

           createMainWidget (container             )                              {
    return new IndicatorWidget(container, this)
  }

           createYAxisWidget (container             )                        {
    return new YAxisWidget(container, this)
  }
}


},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => Pane });
const $mod0 = $load(26);
const UpdateLevel = $mod0.UpdateLevel;
const $mod2 = $load(7);
const createDefaultBounding = $mod2.createDefaultBounding;
const $mod4 = $load(80);
const createDom = $mod4.createDom;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */









class Pane                    {
          _rootContainer
          _container
                   _id
                   _chart

                   _bounding           = createDefaultBounding()

  constructor (rootContainer             , afterElement                       , chart       , id        ) {
    this._chart = chart
    this._id = id
    this._init(rootContainer, afterElement)
  }

          _init (rootContainer             , afterElement                       )       {
    this._rootContainer = rootContainer
    this._container = createDom('div', {
      width: '100%',
      margin: '0',
      padding: '0',
      position: 'relative',
      overflow: 'hidden',
      boxSizing: 'border-box'
    })
    if (afterElement !== null) {
      rootContainer.insertBefore(this._container, afterElement)
    } else {
      rootContainer.appendChild(this._container)
    }
  }

  getContainer ()              {
    return this._container
  }

  getId ()         {
    return this._id
  }

  getChart ()        {
    return this._chart
  }

  getBounding ()           {
    return this._bounding
  }

  update (level              )       {
    if (this._bounding.height !== this._container.clientHeight) {
      this._container.style.height = `${this._bounding.height}px`
    }
    this.updateImp(level ?? UpdateLevel.Drawer, this._container, this._bounding)
  }

  destroy ()       {
    this._rootContainer.removeChild(this._container)
  }






}


},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => SeparatorPane });
const $mod0 = $load(26);
const UpdateLevel = $mod0.UpdateLevel;
const $mod2 = $load(87);
const merge = $mod2.merge;
const $mod4 = $load(80);
const createDom = $mod4.createDom;
const $mod6 = $load(77);
const getPixelRatio = $mod6.getPixelRatio;
const $mod8 = $load(38);
const Pane = $mod8.default;
const $mod10 = $load(72);
const SeparatorWidget = $mod10.default;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */















class SeparatorPane extends Pane {
          _topPane
          _bottomPane

                   _separatorWidget

  constructor (rootContainer             , afterElement                       , chart       , id        , topPane          , bottomPane          ) {
    super(rootContainer, afterElement, chart, id)
    this.getContainer().style.overflow = ''
    this._topPane = topPane
    this._bottomPane = bottomPane
    this._separatorWidget = new SeparatorWidget(this.getContainer(), this)
  }

           setBounding (rootBounding                   )       {
    merge(this.getBounding(), rootBounding)
    return this
  }

  getTopPane ()           {
    return this._topPane
  }

  setTopPane (pane          )       {
    this._topPane = pane
    return this
  }

  getBottomPane ()           {
    return this._bottomPane
  }

  setBottomPane (pane          )       {
    this._bottomPane = pane
    return this
  }

  getWidget ()                  { return this._separatorWidget }

           getImage (_includeOverlay         )                    {
    const { width, height } = this.getBounding()

    const styles = this.getChart().getStyles().separator
    const canvas = createDom('canvas', {
      width: `${width}px`,
      height: `${height}px`,
      boxSizing: 'border-box'
    })
    const ctx = canvas.getContext('2d')
    const pixelRatio = getPixelRatio(canvas)
    canvas.width = width * pixelRatio
    canvas.height = height * pixelRatio
    ctx.scale(pixelRatio, pixelRatio)
    ctx.fillStyle = styles.color
    ctx.fillRect(0, 0, width, height)
    return canvas
  }

           updateImp (level             , container             , bounding          )       {
    if (level === UpdateLevel.All || level === UpdateLevel.Separator) {
      const styles = this.getChart().getStyles().separator
      container.style.backgroundColor = styles.color
      container.style.height = `${bounding.height}px`
      container.style.marginLeft = `${bounding.left}px`
      container.style.width = `${bounding.width}px`
      this._separatorWidget.update(level)
    }
  }
}


},
function ($exports, $load) {
Object.defineProperty($exports, "PanePosition", { enumerable: true, get: () => PanePosition });
Object.defineProperty($exports, "PANE_MIN_HEIGHT", { enumerable: true, get: () => PANE_MIN_HEIGHT });
Object.defineProperty($exports, "PANE_DEFAULT_HEIGHT", { enumerable: true, get: () => PANE_DEFAULT_HEIGHT });
Object.defineProperty($exports, "PaneIdConstants", { enumerable: true, get: () => PaneIdConstants });

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */











const PanePosition = { Top: 'top', Bottom: 'bottom' };











const PANE_MIN_HEIGHT = 30

const PANE_DEFAULT_HEIGHT = 100

const PaneIdConstants = {
  CANDLE: 'candle_pane',
  INDICATOR: 'indicator_pane_',
  X_AXIS: 'x_axis_pane'
}


},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => XAxisPane });
const $mod0 = $load(75);
const XAxisWidget = $mod0.default;
const $mod2 = $load(36);
const DrawPane = $mod2.default;
const $mod4 = $load(147);
const getXAxisClass = $mod4.getXAxisClass;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */










class XAxisPane extends DrawPane        {
           createAxisComponent (name        )        {
    const XAxisClass = getXAxisClass(name)
    return new XAxisClass(this)
  }

           createMainWidget (container             )                              {
    return new XAxisWidget(container, this)
  }
}


},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => ActionStore });
const $mod0 = $load(4);
const Action = $mod0.default;
const $mod2 = $load(87);
const isValid = $mod2.isValid;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */




class ActionStore {
  /**
   * Chart action map
   */
                   _actions = new Map                    ()

  execute (type            , data      )       {
    this._actions.get(type)?.execute(data)
  }

  subscribe (type            , callback                )       {
    if (!this._actions.has(type)) {
      this._actions.set(type, new Action())
    }
    this._actions.get(type)?.subscribe(callback)
  }

  /**
   * 取消事件订阅
   * @param type
   * @param callback
   * @return {boolean}
   */
  unsubscribe (type            , callback                 )       {
    const action = this._actions.get(type)
    if (isValid(action)) {
      action.unsubscribe(callback)
      if (action.isEmpty()) {
        this._actions.delete(type)
      }
    }
  }

  has (type            )          {
    const action = this._actions.get(type)
    return isValid(action) && !action.isEmpty()
  }
}


},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => ChartStore });
const $mod0 = $load(23);
const getDefaultStyles = $mod0.getDefaultStyles;
const $mod2 = $load(87);
const isArray = $mod2.isArray;
const isNumber = $mod2.isNumber;
const isString = $mod2.isString;
const isValid = $mod2.isValid;
const merge = $mod2.merge;
const $mod8 = $load(81);
const formatValue = $mod8.formatValue;
const $mod10 = $load(16);
const LoadDataType = $mod10.LoadDataType;
const $mod12 = $load(4);
const ActionType = $mod12.ActionType;
const $mod14 = $load(3);
const getDefaultCustomApi = $mod14.getDefaultCustomApi;
const defaultLocale = $mod14.defaultLocale;
const $mod17 = $load(46);
const TimeScaleStore = $mod17.default;
const $mod19 = $load(44);
const IndicatorStore = $mod19.default;
const $mod21 = $load(47);
const TooltipStore = $mod21.default;
const $mod23 = $load(45);
const OverlayStore = $mod23.default;
const $mod25 = $load(42);
const ActionStore = $mod25.default;
const $mod27 = $load(144);
const getStyles = $mod27.getStyles;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


























class ChartStore {
  /**
   * Internal chart
   */
                   _chart

  /**
   * Style config
   */
                   _styles = getDefaultStyles()

  /**
   * Custom api
   */
                   _customApi = getDefaultCustomApi()

  /**
   * language
   */
          _locale = defaultLocale

  /**
   * Price and volume precision
   */
          _precision = { price: 2, volume: 0 }

  /**
   * Thousands separator
   */
          _thousandsSeparator = ','

  // Decimal fold threshold
          _decimalFoldThreshold = 3

  /**
   * Data source
   */
          _dataList              = []

  /**
   * Load more data callback
   * Since v9.8.0 deprecated, since v10 removed
   * @deprecated
   */
          _loadMoreCallback                             = null

  /**
   * Load data callback
   */
          _loadDataCallback                             = null

  /**
   * Is loading data flag
   */
          _loading = true

  /**
   * Whether there are forward more flag
   */
          _forwardMore = true

  /**
   * Whether there are forward more flag
   */
          _backwardMore = true

  /**
   * Time scale store
   */
                   _timeScaleStore = new TimeScaleStore(this)

  /**
   * Indicator store
   */
                   _indicatorStore = new IndicatorStore(this)

  /**
   * Overlay store
   */
                   _overlayStore = new OverlayStore(this)

  /**
   * Tooltip store
   */
                   _tooltipStore = new TooltipStore(this)

  /**
   * Chart action store
   */
                   _actionStore = new ActionStore()

  /**
   * Visible data array
   */
          _visibleDataList                = []

  constructor (chart       , options          ) {
    this._chart = chart
    this.setOptions(options)
  }

  /**
   * @description Adjust visible data
   * @return {*}
   */
  adjustVisibleDataList ()       {
    this._visibleDataList = []
    const { realFrom, realTo } = this._timeScaleStore.getVisibleRange()
    for (let i = realFrom; i < realTo; i++) {
      const kLineData = this._dataList[i]
      const x = this._timeScaleStore.dataIndexToCoordinate(i)
      this._visibleDataList.push({
        dataIndex: i,
        x,
        data: kLineData
      })
    }
  }

  setOptions (options          )       {
    if (isValid(options)) {
      const { locale, timezone, styles, customApi, thousandsSeparator, decimalFoldThreshold } = options
      if (isString(locale)) {
        this._locale = locale
      }
      if (isString(timezone)) {
        this._timeScaleStore.setTimezone(timezone)
      }
      if (isValid(styles)) {
        let ss                                = null
        if (isString(styles)) {
          ss = getStyles(styles)
        } else {
          ss = styles
        }
        merge(this._styles, ss)
        // `candle.tooltip.custom` should override
        if (isArray(ss?.candle?.tooltip?.custom)) {
          this._styles.candle.tooltip.custom = ss?.candle?.tooltip?.custom
        }
      }
      if (isValid(customApi)) {
        merge(this._customApi, customApi)
      }
      if (isString(thousandsSeparator)) {
        this._thousandsSeparator = thousandsSeparator
      }
      if (isNumber(decimalFoldThreshold) && decimalFoldThreshold > 0) {
        this._decimalFoldThreshold = decimalFoldThreshold
      }
    }
    return this
  }

  getStyles ()         {
    return this._styles
  }

  getLocale ()         {
    return this._locale
  }

  getCustomApi ()            {
    return this._customApi
  }

  getThousandsSeparator ()         {
    return this._thousandsSeparator
  }

  getDecimalFoldThreshold ()         {
    return this._decimalFoldThreshold
  }

  getPrecision ()            {
    return this._precision
  }

  setPrecision (precision           )       {
    this._precision = precision
    this._indicatorStore.synchronizeSeriesPrecision()
    return this
  }

  getDataList ()              {
    return this._dataList
  }

  getVisibleFirstData ()                      {
    const { from } = this._timeScaleStore.getVisibleRange()
    return this._dataList[from] ?? null
  }

  getVisibleDataList ()                {
    return this._visibleDataList
  }

  async addData (data                         , type               , more          )                {
    let success = false
    let adjustFlag = false
    let dataLengthChange = 0
    if (isArray           (data)) {
      dataLengthChange = data.length
      switch (type) {
        case LoadDataType.Init: {
          this.clear()
          this._dataList = data
          this._forwardMore = more ?? true
          this._timeScaleStore.resetOffsetRightDistance()
          adjustFlag = true
          break
        }
        case LoadDataType.Backward: {
          this._dataList = this._dataList.concat(data)
          this._backwardMore = more ?? false
          adjustFlag = dataLengthChange > 0
          break
        }
        case LoadDataType.Forward: {
          this._dataList = data.concat(this._dataList)
          this._forwardMore = more ?? false
          adjustFlag = dataLengthChange > 0
        }
      }
      this._loading = false
      success = true
    } else {
      const dataCount = this._dataList.length
      // Determine where individual data should be added
      const timestamp = data.timestamp
      const lastDataTimestamp = formatValue(this._dataList[dataCount - 1], 'timestamp', 0)
      if (timestamp > lastDataTimestamp) {
        this._dataList.push(data)
        let lastBarRightSideDiffBarCount = this._timeScaleStore.getLastBarRightSideDiffBarCount()
        if (lastBarRightSideDiffBarCount < 0) {
          this._timeScaleStore.setLastBarRightSideDiffBarCount(--lastBarRightSideDiffBarCount)
        }
        dataLengthChange = 1
        success = true
        adjustFlag = true
      } else if (timestamp === lastDataTimestamp) {
        this._dataList[dataCount - 1] = data
        success = true
        adjustFlag = true
      }
    }
    if (success) {
      try {
        this._overlayStore.updatePointPosition(dataLengthChange, type)
        if (adjustFlag) {
          this._timeScaleStore.adjustVisibleRange()
          this._tooltipStore.recalculateCrosshair(true)
          await this._indicatorStore.calcInstance()
          this._chart.adjustPaneViewport(false, true, true, true)
        }
        this._actionStore.execute(ActionType.OnDataReady)
      } catch {}
    }
  }

  setLoadMoreCallback (callback                  )       {
    this._loadMoreCallback = callback
  }

  executeLoadMoreCallback (timestamp                  )       {
    if (this._forwardMore && !this._loading && isValid(this._loadMoreCallback)) {
      this._loading = true
      this._loadMoreCallback(timestamp)
    }
  }

  setLoadDataCallback (callback                  )       {
    this._loadDataCallback = callback
  }

  executeLoadDataCallback (params                                  )       {
    if (
      !this._loading &&
      isValid(this._loadDataCallback) &&
      (
        (this._forwardMore && params.type === LoadDataType.Forward) ||
        (this._backwardMore && params.type === LoadDataType.Backward)
      )
    ) {
      const cb                                                = (data             , more          ) => {
        this.addData(data, params.type, more).then(() => {}).catch(() => {})
      }
      this._loading = true
      this._loadDataCallback({ ...params, callback: cb })
    }
  }

  clear ()       {
    this._forwardMore = true
    this._backwardMore = true
    this._loading = true
    this._dataList = []
    this._visibleDataList = []
    this._timeScaleStore.clear()
    this._tooltipStore.clear()
  }

  getTimeScaleStore ()                 {
    return this._timeScaleStore
  }

  getIndicatorStore ()                 {
    return this._indicatorStore
  }

  getOverlayStore ()               {
    return this._overlayStore
  }

  getTooltipStore ()               {
    return this._tooltipStore
  }

  getActionStore ()              {
    return this._actionStore
  }

  getChart ()        {
    return this._chart
  }
}


},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => IndicatorStore });
const $mod0 = $load(87);
const isValid = $mod0.isValid;
const isString = $mod0.isString;
const isArray = $mod0.isArray;
const isNumber = $mod0.isNumber;
const isBoolean = $mod0.isBoolean;
const isFunction = $mod0.isFunction;
const $mod7 = $load(31);
const IndicatorSeries = $mod7.IndicatorSeries;
const $mod9 = $load(111);
const getIndicatorClass = $mod9.getIndicatorClass;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */











class IndicatorStore {
                   _chartStore
                   _instances = new Map                        ()

  constructor (chartStore            ) {
    this._chartStore = chartStore
  }

          _overrideInstance (instance              , indicator                    )                              {
    const {
      shortName, series, calcParams, precision, figures, minValue, maxValue,
      shouldOhlc, shouldFormatBigNumber, visible, zLevel, styles, extendData,
      regenerateFigures, createTooltipDataSource, draw, calc
    } = indicator
    let updateFlag = false
    if (isString(shortName) && instance.setShortName(shortName)) {
      updateFlag = true
    }
    if (isValid(series) && instance.setSeries(series)) {
      updateFlag = true
    }
    let calcFlag = false
    if (isArray(calcParams) && instance.setCalcParams(calcParams)) {
      updateFlag = true
      calcFlag = true
    }
    if (isArray(figures) && instance.setFigures(figures)) {
      updateFlag = true
      calcFlag = true
    }
    if (minValue !== undefined && instance.setMinValue(minValue)) {
      updateFlag = true
    }
    if (maxValue !== undefined && instance.setMinValue(maxValue)) {
      updateFlag = true
    }
    if (isNumber(precision) && instance.setPrecision(precision)) {
      updateFlag = true
    }
    if (isBoolean(shouldOhlc) && instance.setShouldOhlc(shouldOhlc)) {
      updateFlag = true
    }
    if (isBoolean(shouldFormatBigNumber) && instance.setShouldFormatBigNumber(shouldFormatBigNumber)) {
      updateFlag = true
    }
    if (isBoolean(visible) && instance.setVisible(visible)) {
      updateFlag = true
    }
    let sortFlag = false
    if (isNumber(zLevel) && instance.setZLevel(zLevel)) {
      updateFlag = true
      sortFlag = true
    }
    if (isValid(styles) && instance.setStyles(styles)) {
      updateFlag = true
    }
    if (extendData !== undefined && instance.setExtendData(extendData)) {
      updateFlag = true
      calcFlag = true
    }
    if (regenerateFigures !== undefined && instance.setRegenerateFigures(regenerateFigures)) {
      updateFlag = true
    }
    if (createTooltipDataSource !== undefined && instance.setCreateTooltipDataSource(createTooltipDataSource)) {
      updateFlag = true
    }
    if (draw !== undefined && instance.setDraw(draw)) {
      updateFlag = true
    }
    if (isFunction(calc)) {
      instance.calc = calc
      calcFlag = true
    }
    return [updateFlag, calcFlag, sortFlag]
  }

          _sort (paneId         )       {
    if (isString(paneId)) {
      this._instances.get(paneId)?.sort((i1, i2) => i1.zLevel - i2.zLevel)
    } else {
      this._instances.forEach(paneInstances => {
        paneInstances.sort((i1, i2) => i1.zLevel - i2.zLevel)
      })
    }
  }

  async addInstance (indicator                 , paneId        , isStack         )                   {
    const { name } = indicator
    let paneInstances = this._instances.get(paneId)
    if (isValid(paneInstances)) {
      const instance = paneInstances.find(ins => ins.name === name)
      if (isValid(instance)) {
        return await Promise.reject(new Error('Duplicate indicators.'))
      }
    }
    if (!isValid(paneInstances)) {
      paneInstances = []
    }
    const IndicatorClazz = getIndicatorClass(name)
    const instance = new IndicatorClazz()

    this.synchronizeSeriesPrecision(instance)
    this._overrideInstance(instance, indicator)
    if (!isStack) {
      paneInstances = []
    }
    paneInstances.push(instance)
    this._instances.set(paneId, paneInstances)
    this._sort(paneId)
    return await instance.calcIndicator(this._chartStore.getDataList())
  }

  getInstances (paneId        )                 {
    return this._instances.get(paneId) ?? []
  }

  removeInstance (paneId        , name         )          {
    let removed = false
    const paneInstances = this._instances.get(paneId)
    if (isValid(paneInstances)) {
      if (isString(name)) {
        const index = paneInstances.findIndex(ins => ins.name === name)
        if (index > -1) {
          paneInstances.splice(index, 1)
          removed = true
        }
      } else {
        this._instances.set(paneId, [])
        removed = true
      }
      if (this._instances.get(paneId)?.length === 0) {
        this._instances.delete(paneId)
      }
    }
    return removed
  }

  hasInstances (paneId        )          {
    return this._instances.has(paneId)
  }

  async calcInstance (name         , paneId         )                   {
    const tasks                          = []
    if (isString(name)) {
      if (isString(paneId)) {
        const paneInstances = this._instances.get(paneId)
        if (isValid(paneInstances)) {
          const instance = paneInstances.find(ins => ins.name === name)
          if (isValid(instance)) {
            tasks.push(instance.calcIndicator(this._chartStore.getDataList()))
          }
        }
      } else {
        this._instances.forEach(paneInstances => {
          const instance = paneInstances.find(ins => ins.name === name)
          if (isValid(instance)) {
            tasks.push(instance.calcIndicator(this._chartStore.getDataList()))
          }
        })
      }
    } else {
      this._instances.forEach(paneInstances => {
        paneInstances.forEach(instance => {
          tasks.push(instance.calcIndicator(this._chartStore.getDataList()))
        })
      })
    }
    const result = await Promise.all(tasks)
    return result.includes(true)
  }

  getInstanceByPaneId (paneId         , name         )                                                                                               {
    const createMapping                                                          = (instances                ) => {
      const mapping = new Map                   ()
      instances.forEach(ins => {
        mapping.set(ins.name, ins)
      })
      return mapping
    }

    if (isString(paneId)) {
      const paneInstances = this._instances.get(paneId) ?? []
      if (isString(name)) {
        return paneInstances?.find(ins => ins.name === name) ?? null
      }
      return createMapping(paneInstances)
    }
    const mapping = new Map                                ()
    this._instances.forEach((instances, paneId) => {
      mapping.set(paneId, createMapping(instances))
    })
    return mapping
  }

  synchronizeSeriesPrecision (indicator               )       {
    const { price: pricePrecision, volume: volumePrecision } = this._chartStore.getPrecision()
    const synchronize                                     = instance => {
      switch (instance.series) {
        case IndicatorSeries.Price: {
          instance.setPrecision(pricePrecision, true)
          break
        }
        case IndicatorSeries.Volume: {
          instance.setPrecision(volumePrecision, true)
          break
        }
        default: { break }
      }
    }

    if (isValid(indicator)) {
      synchronize(indicator)
    } else {
      this._instances.forEach(paneInstances => {
        paneInstances.forEach(instance => {
          synchronize(instance)
        })
      })
    }
  }

  async override (indicator                 , paneId                  )                              {
    const { name } = indicator
    let instances = new Map                        ()
    if (paneId !== null) {
      const paneInstances = this._instances.get(paneId)
      if (isValid(paneInstances)) {
        instances.set(paneId, paneInstances)
      }
    } else {
      instances = this._instances
    }
    let onlyUpdateFlag = false
    const tasks                          = []
    let sortFlag = false
    instances.forEach(paneInstances => {
      const instance = paneInstances.find(ins => ins.name === name)
      if (isValid(instance)) {
        const overrideResult = this._overrideInstance(instance, indicator)
        if (overrideResult[2]) {
          sortFlag = true
        }
        if (overrideResult[1]) {
          tasks.push(instance.calcIndicator(this._chartStore.getDataList()))
        } else {
          if (overrideResult[0]) {
            onlyUpdateFlag = true
          }
        }
      }
    })
    if (sortFlag) {
      this._sort()
    }
    const result = await Promise.all(tasks)
    return [onlyUpdateFlag, result.includes(true)]
  }
}


},
function ($exports, $load) {
Object.defineProperty($exports, "EventOverlayInfoFigureType", { enumerable: true, get: () => EventOverlayInfoFigureType });
Object.defineProperty($exports, "default", { enumerable: true, get: () => OverlayStore });
const $mod0 = $load(26);
const UpdateLevel = $mod0.UpdateLevel;
const $mod2 = $load(87);
const isFunction = $mod2.isFunction;
const isValid = $mod2.isValid;
const isString = $mod2.isString;
const isBoolean = $mod2.isBoolean;
const isNumber = $mod2.isNumber;
const isArray = $mod2.isArray;
const $mod9 = $load(82);
const createId = $mod9.createId;
const $mod11 = $load(16);
const LoadDataType = $mod11.LoadDataType;
const $mod13 = $load(32);
const OVERLAY_ID_PREFIX = $mod13.OVERLAY_ID_PREFIX;
const $mod15 = $load(131);
const getOverlayInnerClass = $mod15.getOverlayInnerClass;
const $mod17 = $load(40);
const PaneIdConstants = $mod17.PaneIdConstants;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
























const EventOverlayInfoFigureType = { None: 0, 0: "None", Point: 1, 1: "Point", Other: 2, 2: "Other" };










class OverlayStore {
                   _chartStore

          _instances = new Map                      ()

  /**
   * Overlay information in painting
   */
          _progressInstanceInfo                                = null

  /**
   * Overlay information by the mouse pressed
   */
          _pressedInstanceInfo                   = {
    paneId: '',
    instance: null,
    figureType: EventOverlayInfoFigureType.None,
    figureKey: '',
    figureIndex: -1,
    attrsIndex: -1
  }

  /**
   * Overlay information by hover
   */
          _hoverInstanceInfo                   = {
    paneId: '',
    instance: null,
    figureType: EventOverlayInfoFigureType.None,
    figureKey: '',
    figureIndex: -1,
    attrsIndex: -1
  }

  /**
   * Overlay information by the mouse click
   */
          _clickInstanceInfo                   = {
    paneId: '',
    instance: null,
    figureType: EventOverlayInfoFigureType.None,
    figureKey: '',
    figureIndex: -1,
    attrsIndex: -1
  }

  constructor (chartStore            ) {
    this._chartStore = chartStore
  }

          _overrideInstance (instance            , overlay                        )                     {
    const {
      id, groupId, points, styles, lock, visible,
      zLevel, mode, modeSensitivity, extendData,
      onDrawStart, onDrawing,
      onDrawEnd, onClick, onDoubleClick, onRightClick,
      onPressedMoveStart, onPressedMoving, onPressedMoveEnd,
      onMouseEnter, onMouseLeave,
      onRemoved, onSelected, onDeselected
    } = overlay
    let updateFlag = false
    let sortFlag = false
    if (isString(id)) {
      instance.setId(id)
    }
    if (isString(groupId)) {
      instance.setGroupId(groupId)
    }
    if (isArray(points) && instance.setPoints(points)) {
      updateFlag = true
    }
    if (isValid(styles) && instance.setStyles(styles)) {
      updateFlag = true
    }
    if (isBoolean(lock)) {
      instance.setLock(lock)
    }
    if (isBoolean(visible) && instance.setVisible(visible)) {
      updateFlag = true
    }
    if (isNumber(zLevel) && instance.setZLevel(zLevel)) {
      updateFlag = true
      sortFlag = true
    }
    if (isValid(mode)) {
      instance.setMode(mode)
    }
    if (isNumber(modeSensitivity)) {
      instance.setModeSensitivity(modeSensitivity)
    }
    if (extendData !== undefined && instance.setExtendData(extendData)) {
      updateFlag = true
    }
    if (onDrawStart !== undefined) {
      instance.setOnDrawStartCallback(onDrawStart)
    }
    if (onDrawing !== undefined) {
      instance.setOnDrawingCallback(onDrawing)
    }
    if (onDrawEnd !== undefined) {
      instance.setOnDrawEndCallback(onDrawEnd)
    }
    if (onClick !== undefined) {
      instance.setOnClickCallback(onClick)
    }
    if (onDoubleClick !== undefined) {
      instance.setOnDoubleClickCallback(onDoubleClick)
    }
    if (onRightClick !== undefined) {
      instance.setOnRightClickCallback(onRightClick)
    }
    if (onPressedMoveStart !== undefined) {
      instance.setOnPressedMoveStartCallback(onPressedMoveStart)
    }
    if (onPressedMoving !== undefined) {
      instance.setOnPressedMovingCallback(onPressedMoving)
    }
    if (onPressedMoveEnd !== undefined) {
      instance.setOnPressedMoveEndCallback(onPressedMoveEnd)
    }
    if (onMouseEnter !== undefined) {
      instance.setOnMouseEnterCallback(onMouseEnter)
    }
    if (onMouseLeave !== undefined) {
      instance.setOnMouseLeaveCallback(onMouseLeave)
    }
    if (onRemoved !== undefined) {
      instance.setOnRemovedCallback(onRemoved)
    }
    if (onSelected !== undefined) {
      instance.setOnSelectedCallback(onSelected)
    }
    if (onDeselected !== undefined) {
      instance.setOnDeselectedCallback(onDeselected)
    }
    return [updateFlag, sortFlag]
  }

  getInstanceById (id        )                       {
    for (const entry of this._instances) {
      const paneShapes = entry[1]
      const overlay = paneShapes.find(s => s.id === id)
      if (isValid(overlay)) {
        return overlay
      }
    }
    if (this._progressInstanceInfo !== null) {
      if (this._progressInstanceInfo.instance.id === id) {
        return this._progressInstanceInfo.instance
      }
    }
    return null
  }

          _sort (paneId         )       {
    if (isString(paneId)) {
      this._instances.get(paneId)?.sort((o1, o2) => o1.zLevel - o2.zLevel)
    } else {
      this._instances.forEach(paneInstances => {
        paneInstances.sort((o1, o2) => o1.zLevel - o2.zLevel)
      })
    }
  }

  addInstances (overlays                 , paneId        , appointPaneFlag         )                          {
    const ids = overlays.map(overlay => {
      const id = overlay.id ?? createId(OVERLAY_ID_PREFIX)
      if (this.getInstanceById(id) === null) {
        const OverlayClazz = getOverlayInnerClass(overlay.name)
        if (OverlayClazz !== null) {
          const instance = new OverlayClazz()
          instance.setPaneId(paneId)
          const groupId = overlay.groupId ?? id
          overlay.id = id
          overlay.groupId = groupId
          this._overrideInstance(instance, overlay)
          if (instance.isDrawing()) {
            this._progressInstanceInfo = { paneId, instance, appointPaneFlag }
          } else {
            if (!this._instances.has(paneId)) {
              this._instances.set(paneId, [])
            }
            this._instances.get(paneId)?.push(instance)
          }
          if (instance.isStart()) {
            instance.onDrawStart?.(({ overlay: instance }))
          }
          return id
        }
      }
      return null
    })
    if (ids.some(id => id !== null)) {
      this._sort()
      const chart = this._chartStore.getChart()
      chart.updatePane(UpdateLevel.Overlay, paneId)
      chart.updatePane(UpdateLevel.Overlay, PaneIdConstants.X_AXIS)
    }
    return ids
  }

  getProgressInstanceInfo ()                                {
    return this._progressInstanceInfo
  }

  progressInstanceComplete ()       {
    if (this._progressInstanceInfo !== null) {
      const { instance, paneId } = this._progressInstanceInfo
      if (!instance.isDrawing()) {
        if (!this._instances.has(paneId)) {
          this._instances.set(paneId, [])
        }
        this._instances.get(paneId)?.push(instance)
        this._sort(paneId)
        this._progressInstanceInfo = null
      }
    }
  }

  updateProgressInstanceInfo (paneId        , appointPaneFlag          )       {
    if (this._progressInstanceInfo !== null) {
      if (isBoolean(appointPaneFlag) && appointPaneFlag) {
        this._progressInstanceInfo.appointPaneFlag = appointPaneFlag
      }
      this._progressInstanceInfo.paneId = paneId
      this._progressInstanceInfo.instance.setPaneId(paneId)
    }
  }

  getInstances (paneId         )               {
    if (!isString(paneId)) {
      let instances               = []
      this._instances.forEach(paneInstances => {
        instances = instances.concat(paneInstances)
      })
      return instances
    }
    return this._instances.get(paneId) ?? []
  }

  override (overlay                        )       {
    const { id, groupId, name } = overlay
    let updateFlag = false
    let sortFlag = false

    const setFlag                                 = (instance            ) => {
      const flags = this._overrideInstance(instance, overlay)
      if (flags[0]) {
        updateFlag = true
      }
      if (flags[1]) {
        sortFlag = true
      }
    }

    if (isString(id)) {
      const instance = this.getInstanceById(id)
      if (instance !== null) {
        setFlag(instance)
      }
    } else {
      const nameValid = isString(name)
      const groupIdValid = isString(groupId)
      this._instances.forEach(paneInstances => {
        paneInstances.forEach(instance => {
          if (
            (nameValid && instance.name === name) ||
            (groupIdValid && instance.groupId === groupId) ||
            (!nameValid && !groupIdValid)
          ) {
            setFlag(instance)
          }
        })
      })
      if (this._progressInstanceInfo !== null) {
        const progressInstance = this._progressInstanceInfo.instance
        if (
          (nameValid && progressInstance.name === name) ||
          (groupIdValid && progressInstance.groupId === groupId) ||
          (!nameValid && !groupIdValid)
        ) {
          setFlag(progressInstance)
        }
      }
    }
    if (sortFlag) {
      this._sort()
    }
    if (updateFlag) {
      this._chartStore.getChart().updatePane(UpdateLevel.Overlay)
    }
  }

  removeInstance (overlayRemove                )       {
    const match                                                            = (remove               , overlay            ) => {
      if (isString(remove.id)) {
        if (overlay.id !== remove.id) {
          return false
        }
      } else {
        if (isString(remove.groupId)) {
          if (overlay.groupId !== remove.groupId) {
            return false
          }
        } else {
          if (isString(remove.name)) {
            if (overlay.name !== remove.name) {
              return false
            }
          }
        }
      }
      return true
    }

    const updatePaneIds           = []
    const overlayRemoveValid = isValid(overlayRemove)
    if (this._progressInstanceInfo !== null) {
      const { instance } = this._progressInstanceInfo
      if (
        !overlayRemoveValid ||
        (overlayRemoveValid && match(overlayRemove, instance))
      ) {
        updatePaneIds.push(this._progressInstanceInfo.paneId)
        instance.onRemoved?.({ overlay: instance })
        this._progressInstanceInfo = null
      }
    }
    if (overlayRemoveValid) {
      const instances = new Map                      ()
      for (const entry of this._instances) {
        const paneInstances = entry[1]
        const newPaneInstances = paneInstances.filter(instance => {
          if (match(overlayRemove, instance)) {
            if (!updatePaneIds.includes(entry[0])) {
              updatePaneIds.push(entry[0])
            }
            instance.onRemoved?.({ overlay: instance })
            return false
          }
          return true
        })
        if (newPaneInstances.length > 0) {
          instances.set(entry[0], newPaneInstances)
        }
      }
      this._instances = instances
    } else {
      this._instances.forEach((paneInstances, paneId) => {
        updatePaneIds.push(paneId)
        paneInstances.forEach(instance => {
          instance.onRemoved?.({ overlay: instance })
        })
      })
      this._instances.clear()
    }
    if (updatePaneIds.length > 0) {
      const chart = this._chartStore.getChart()
      updatePaneIds.forEach(paneId => {
        chart.updatePane(UpdateLevel.Overlay, paneId)
      })
      chart.updatePane(UpdateLevel.Overlay, PaneIdConstants.X_AXIS)
    }
  }

  setPressedInstanceInfo (info                  )       {
    this._pressedInstanceInfo = info
  }

  getPressedInstanceInfo ()                   {
    return this._pressedInstanceInfo
  }

  updatePointPosition (dataChangeLength        , type               )       {
    if (dataChangeLength > 0) {
      const dataList = this._chartStore.getDataList()
      this._instances.forEach(overlays => {
        overlays.forEach(o => {
          const points = o.points
          points.forEach(point => {
            if (!isValid(point.timestamp) && isValid(point.dataIndex)) {
              if (type === LoadDataType.Forward) {
                point.dataIndex = point.dataIndex + dataChangeLength
              }
              const data = dataList[point.dataIndex]
              point.timestamp = data?.timestamp
            }
          })
        })
      })
    }
  }

  setHoverInstanceInfo (info                  , event                 )       {
    const { instance, figureType, figureKey, figureIndex } = this._hoverInstanceInfo
    if (
      instance?.id !== info.instance?.id ||
      figureType !== info.figureType ||
      figureIndex !== info.figureIndex
    ) {
      this._hoverInstanceInfo = info
      if (instance?.id !== info.instance?.id) {
        let ignoreUpdateFlag = false
        let sortFlag = false
        if (instance !== null) {
          sortFlag = true
          if (isFunction(instance.onMouseLeave)) {
            instance.onMouseLeave({ overlay: instance, figureKey, figureIndex, ...event })
            ignoreUpdateFlag = true
          }
        }

        if (info.instance !== null) {
          sortFlag = true
          if (isFunction(info.instance.onMouseEnter)) {
            info.instance.onMouseEnter({ overlay: info.instance, figureKey: info.figureKey, figureIndex: info.figureIndex, ...event })
            ignoreUpdateFlag = true
          }
        }
        if (sortFlag) {
          this._sort()
        }
        if (!ignoreUpdateFlag) {
          this._chartStore.getChart().updatePane(UpdateLevel.Overlay)
        }
      }
    }
  }

  getHoverInstanceInfo ()                   {
    return this._hoverInstanceInfo
  }

  setClickInstanceInfo (info                  , event                 )       {
    const { paneId, instance, figureType, figureKey, figureIndex } = this._clickInstanceInfo
    if (!(info.instance?.isDrawing() ?? false)) {
      info.instance?.onClick?.({ overlay: info.instance, figureKey: info.figureKey, figureIndex: info.figureIndex, ...event })
    }
    if (instance?.id !== info.instance?.id || figureType !== info.figureType || figureIndex !== info.figureIndex) {
      this._clickInstanceInfo = info
      if (instance?.id !== info.instance?.id) {
        instance?.onDeselected?.({ overlay: instance, figureKey, figureIndex, ...event })
        info.instance?.onSelected?.({ overlay: info.instance, figureKey: info.figureKey, figureIndex: info.figureIndex, ...event })
        const chart = this._chartStore.getChart()
        chart.updatePane(UpdateLevel.Overlay, info.paneId)
        if (paneId !== info.paneId) {
          chart.updatePane(UpdateLevel.Overlay, paneId)
        }
        chart.updatePane(UpdateLevel.Overlay, PaneIdConstants.X_AXIS)
      }
    }
  }

  getClickInstanceInfo ()                   {
    return this._clickInstanceInfo
  }

  isEmpty ()          {
    return this._instances.size === 0 && this._progressInstanceInfo === null
  }

  isDrawing ()          {
    return this._progressInstanceInfo !== null && (this._progressInstanceInfo?.instance.isDrawing() ?? false)
  }
}


},
function ($exports, $load) {
Object.defineProperty($exports, "SCALE_MULTIPLIER", { enumerable: true, get: () => SCALE_MULTIPLIER });
Object.defineProperty($exports, "default", { enumerable: true, get: () => TimeScaleStore });
const $mod0 = $load(28);
const getDefaultVisibleRange = $mod0.getDefaultVisibleRange;
const $mod2 = $load(4);
const ActionType = $mod2.ActionType;
const $mod4 = $load(83);
const logWarn = $mod4.logWarn;
const $mod6 = $load(84);
const binarySearchNearest = $mod6.binarySearchNearest;
const $mod8 = $load(87);
const isNumber = $mod8.isNumber;
const isString = $mod8.isString;
const $mod11 = $load(16);
const LoadDataType = $mod11.LoadDataType;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */





















const BarSpaceLimitConstants = {
  MIN: 1,
  MAX: 50
}

const ScrollLimitRole = { BarCount: 0, 0: "BarCount", Distance: 1, 1: "Distance" };

const DEFAULT_BAR_SPACE = 8

const DEFAULT_OFFSET_RIGHT_DISTANCE = 80

const GAP_BAR_SPACE_RATIO = 0.88

const SCALE_MULTIPLIER = 10

class TimeScaleStore {
  /**
   * Root store
   */
                   _chartStore

  /**
   * Time format
   */
          _dateTimeFormat                      = this._buildDateTimeFormat()

  /**
   * Scale enabled flag
   */
          _zoomEnabled          = true

  /**
   * Scroll enabled flag
   */
          _scrollEnabled          = true

  /**
   * Total space of drawing area
   */
          _totalBarSpace         = 0

  /**
   * Space occupied by a single piece of data
   */
          _barSpace         = DEFAULT_BAR_SPACE

  /**
   * The space of the draw bar
   */
          _gapBarSpace

  /**
   * Distance from the last data to the right of the drawing area
   */
          _offsetRightDistance = DEFAULT_OFFSET_RIGHT_DISTANCE

  /**
   * The number of bar calculated from the distance of the last data to the right of the drawing area
   */
          _lastBarRightSideDiffBarCount

  /**
   * The number of bar to the right of the drawing area from the last data when scrolling starts
   */
          _startLastBarRightSideDiffBarCount = 0

  /**
   * Scroll limit role
   */
          _scrollLimitRole                  = ScrollLimitRole.BarCount

  /**
   * Scroll to the leftmost and rightmost visible bar
   */
                   _minVisibleBarCount                = { left: 2, right: 2 }

  /**
   * Scroll to the leftmost and rightmost distance
   */
                   _maxOffsetDistance                = { left: 50, right: 50 }

  /**
   * Start and end points of visible area data index
   */
          _visibleRange               = getDefaultVisibleRange()

  constructor (chartStore            ) {
    this._chartStore = chartStore
    this._gapBarSpace = this._calcGapBarSpace()
    this._lastBarRightSideDiffBarCount = this._offsetRightDistance / this._barSpace
  }

          _calcGapBarSpace ()         {
    let gapBarSpace
    if (this._barSpace > 3) {
      gapBarSpace = Math.floor(this._barSpace * GAP_BAR_SPACE_RATIO)
    } else {
      gapBarSpace = Math.floor(this._barSpace)
      if (gapBarSpace === this._barSpace) {
        gapBarSpace--
      }
    }
    if (gapBarSpace % 2 === 0) {
      gapBarSpace--
    }
    gapBarSpace = Math.max(1, gapBarSpace)
    return gapBarSpace
  }

  /**
   * adjust visible range
   */
  adjustVisibleRange ()       {
    const dataList = this._chartStore.getDataList()
    const totalBarCount = dataList.length
    const visibleBarCount = this._totalBarSpace / this._barSpace

    let leftMinVisibleBarCount
    let rightMinVisibleBarCount

    if (this._scrollLimitRole === ScrollLimitRole.Distance) {
      leftMinVisibleBarCount = (this._totalBarSpace - this._maxOffsetDistance.right) / this._barSpace
      rightMinVisibleBarCount = (this._totalBarSpace - this._maxOffsetDistance.left) / this._barSpace
    } else {
      leftMinVisibleBarCount = this._minVisibleBarCount.left
      rightMinVisibleBarCount = this._minVisibleBarCount.right
    }

    leftMinVisibleBarCount = Math.max(0, leftMinVisibleBarCount)
    rightMinVisibleBarCount = Math.max(0, rightMinVisibleBarCount)

    const maxRightOffsetBarCount = visibleBarCount - Math.min(leftMinVisibleBarCount, totalBarCount)
    if (this._lastBarRightSideDiffBarCount > maxRightOffsetBarCount) {
      this._lastBarRightSideDiffBarCount = maxRightOffsetBarCount
    }

    const minRightOffsetBarCount = -totalBarCount + Math.min(rightMinVisibleBarCount, totalBarCount)
    if (this._lastBarRightSideDiffBarCount < minRightOffsetBarCount) {
      this._lastBarRightSideDiffBarCount = minRightOffsetBarCount
    }

    let to = Math.round(this._lastBarRightSideDiffBarCount + totalBarCount + 0.5)
    const realTo = to
    if (to > totalBarCount) {
      to = totalBarCount
    }
    let from = Math.round(to - visibleBarCount) - 1
    if (from < 0) {
      from = 0
    }
    const realFrom = this._lastBarRightSideDiffBarCount > 0 ? Math.round(totalBarCount + this._lastBarRightSideDiffBarCount - visibleBarCount) - 1 : from
    this._visibleRange = { from, to, realFrom, realTo }
    this._chartStore.getActionStore().execute(ActionType.OnVisibleRangeChange, this._visibleRange)
    this._chartStore.adjustVisibleDataList()
    // More processing and loading, more loading if there are callback methods and no data is being loaded
    if (from === 0) {
      const firstData = dataList[0]
      this._chartStore.executeLoadMoreCallback(firstData?.timestamp ?? null)
      this._chartStore.executeLoadDataCallback({
        type: LoadDataType.Forward,
        data: firstData ?? null
      })
    }
    if (to === totalBarCount) {
      this._chartStore.executeLoadDataCallback({
        type: LoadDataType.Backward,
        data: dataList[totalBarCount - 1] ?? null
      })
    }
  }

  getDateTimeFormat ()                      {
    return this._dateTimeFormat
  }

  _buildDateTimeFormat (timezone         )                                {
    const options                             = {
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }
    if (isString(timezone)) {
      options.timeZone = timezone
    }
    let dateTimeFormat                                = null
    try {
      dateTimeFormat = new Intl.DateTimeFormat('en', options)
    } catch (e) {
      logWarn('', '', 'Timezone is error!!!')
    }
    return dateTimeFormat
  }

  setTimezone (timezone        )       {
    const dateTimeFormat                                = this._buildDateTimeFormat(timezone)
    if (dateTimeFormat !== null) {
      this._dateTimeFormat = dateTimeFormat
    }
  }

  getTimezone ()         {
    return this._dateTimeFormat.resolvedOptions().timeZone
  }

  getBarSpace ()           {
    return {
      bar: this._barSpace,
      halfBar: this._barSpace / 2,
      gapBar: this._gapBarSpace,
      halfGapBar: Math.floor(this._gapBarSpace / 2)
    }
  }

  setBarSpace (barSpace        , adjustBeforeFunc             )       {
    if (barSpace < BarSpaceLimitConstants.MIN || barSpace > BarSpaceLimitConstants.MAX || this._barSpace === barSpace) {
      return
    }
    this._barSpace = barSpace
    this._gapBarSpace = this._calcGapBarSpace()
    adjustBeforeFunc?.()
    this.adjustVisibleRange()
    this._chartStore.getTooltipStore().recalculateCrosshair(true)
    this._chartStore.getChart().adjustPaneViewport(false, true, true, true)
  }

  setTotalBarSpace (totalSpace        )       {
    if (this._totalBarSpace !== totalSpace) {
      this._totalBarSpace = totalSpace
      this.adjustVisibleRange()
      this._chartStore.getTooltipStore().recalculateCrosshair(true)
    }
    return this
  }

  setOffsetRightDistance (distance        , isUpdate          )       {
    this._offsetRightDistance = this._scrollLimitRole === ScrollLimitRole.Distance ? Math.min(this._maxOffsetDistance.right, distance) : distance
    this._lastBarRightSideDiffBarCount = this._offsetRightDistance / this._barSpace
    if (isUpdate ?? false) {
      this.adjustVisibleRange()
      this._chartStore.getTooltipStore().recalculateCrosshair(true)
      this._chartStore.getChart().adjustPaneViewport(false, true, true, true)
    }
    return this
  }

  resetOffsetRightDistance ()       {
    this.setOffsetRightDistance(this._offsetRightDistance)
  }

  getInitialOffsetRightDistance ()         {
    return this._offsetRightDistance
  }

  getOffsetRightDistance ()         {
    return Math.max(0, this._lastBarRightSideDiffBarCount * this._barSpace)
  }

  getLastBarRightSideDiffBarCount ()         {
    return this._lastBarRightSideDiffBarCount
  }

  setLastBarRightSideDiffBarCount (barCount        )       {
    this._lastBarRightSideDiffBarCount = barCount
    return this
  }

  setMaxOffsetLeftDistance (distance        )       {
    this._scrollLimitRole = ScrollLimitRole.Distance
    this._maxOffsetDistance.left = distance
    return this
  }

  setMaxOffsetRightDistance (distance        )       {
    this._scrollLimitRole = ScrollLimitRole.Distance
    this._maxOffsetDistance.right = distance
    return this
  }

  setLeftMinVisibleBarCount (barCount        )       {
    this._scrollLimitRole = ScrollLimitRole.BarCount
    this._minVisibleBarCount.left = barCount
    return this
  }

  setRightMinVisibleBarCount (barCount        )       {
    this._scrollLimitRole = ScrollLimitRole.BarCount
    this._minVisibleBarCount.right = barCount
    return this
  }

  getVisibleRange ()               {
    return this._visibleRange
  }

  startScroll ()       {
    this._startLastBarRightSideDiffBarCount = this._lastBarRightSideDiffBarCount
  }

  scroll (distance        )       {
    if (!this._scrollEnabled) {
      return
    }
    const distanceBarCount = distance / this._barSpace
    const prevLastBarRightSideDistance = this._lastBarRightSideDiffBarCount * this._barSpace
    this._lastBarRightSideDiffBarCount = this._startLastBarRightSideDiffBarCount - distanceBarCount
    this.adjustVisibleRange()
    this._chartStore.getTooltipStore().recalculateCrosshair(true)
    this._chartStore.getChart().adjustPaneViewport(false, true, true, true)
    const realDistance = Math.round(
      prevLastBarRightSideDistance - this._lastBarRightSideDiffBarCount * this._barSpace
    )
    if (realDistance !== 0) {
      this._chartStore.getActionStore().execute(ActionType.OnScroll, { distance: realDistance })
    }
  }

  getDataByDataIndex (dataIndex        )                      {
    return this._chartStore.getDataList()[dataIndex] ?? null
  }

  coordinateToFloatIndex (x        )         {
    const dataCount = this._chartStore.getDataList().length
    const deltaFromRight = (this._totalBarSpace - x) / this._barSpace
    const index = dataCount + this._lastBarRightSideDiffBarCount - deltaFromRight
    return Math.round(index * 1000000) / 1000000
  }

  dataIndexToTimestamp (dataIndex        )                   {
    const data = this.getDataByDataIndex(dataIndex)
    return data?.timestamp ?? null
  }

  timestampToDataIndex (timestamp        )         {
    const dataList = this._chartStore.getDataList()
    if (dataList.length === 0) {
      return 0
    }
    return binarySearchNearest(dataList, 'timestamp', timestamp)
  }

  dataIndexToCoordinate (dataIndex        )         {
    const dataCount = this._chartStore.getDataList().length
    const deltaFromRight = dataCount + this._lastBarRightSideDiffBarCount - dataIndex
    // return Math.floor(this._totalBarSpace - (deltaFromRight - 0.5) * this._barSpace) - 0.5
    return Math.floor(this._totalBarSpace - (deltaFromRight - 0.5) * this._barSpace)
  }

  coordinateToDataIndex (x        )         {
    return Math.ceil(this.coordinateToFloatIndex(x)) - 1
  }

  zoom (scale        , coordinate                      )       {
    if (!this._zoomEnabled) {
      return
    }
    let zoomCoordinate                                = coordinate ?? null
    if (!isNumber(zoomCoordinate?.x)) {
      const crosshair = this._chartStore.getTooltipStore().getCrosshair()
      zoomCoordinate = { x: crosshair?.x ?? this._totalBarSpace / 2 }
    }
    const x = zoomCoordinate .x
    const floatIndex = this.coordinateToFloatIndex(x)
    const prevBarSpace = this._barSpace
    const barSpace = this._barSpace + scale * (this._barSpace / SCALE_MULTIPLIER)
    this.setBarSpace(barSpace, () => {
      this._lastBarRightSideDiffBarCount += (floatIndex - this.coordinateToFloatIndex(x))
    })
    const realScale = this._barSpace / prevBarSpace
    if (realScale !== 1) {
      this._chartStore.getActionStore().execute(ActionType.OnZoom, { scale: realScale })
    }
  }

  setZoomEnabled (enabled         )       {
    this._zoomEnabled = enabled
    return this
  }

  getZoomEnabled ()          {
    return this._zoomEnabled
  }

  setScrollEnabled (enabled         )       {
    this._scrollEnabled = enabled
    return this
  }

  getScrollEnabled ()          {
    return this._scrollEnabled
  }

  clear ()       {
    this._visibleRange = getDefaultVisibleRange()
  }
}


},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => TooltipStore });
const $mod0 = $load(26);
const UpdateLevel = $mod0.UpdateLevel;
const $mod2 = $load(87);
const isNumber = $mod2.isNumber;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */















class TooltipStore {
                   _chartStore
          _crosshair            = {}
          _activeIcon                        = null

  constructor (chartStore            ) {
    this._chartStore = chartStore
  }

  /**
    * 设置十字光标点信息
    * @param crosshair
    * @param options
    */
  setCrosshair (crosshair            , options                                                          )       {
    const { notInvalidate, notExecuteAction } = options ?? {}
    const dataList = this._chartStore.getDataList()
    const cr = crosshair ?? {}
    let realDataIndex
    let dataIndex
    if (isNumber(cr.x)) {
      realDataIndex = this._chartStore.getTimeScaleStore().coordinateToDataIndex(cr.x)
      if (realDataIndex < 0) {
        dataIndex = 0
      } else if (realDataIndex > dataList.length - 1) {
        dataIndex = dataList.length - 1
      } else {
        dataIndex = realDataIndex
      }
    } else {
      realDataIndex = dataList.length - 1
      dataIndex = realDataIndex
    }
    const kLineData                      = dataList[dataIndex]
    const realX = this._chartStore.getTimeScaleStore().dataIndexToCoordinate(realDataIndex)
    const prevCrosshair = { x: this._crosshair.x, y: this._crosshair.y, paneId: this._crosshair.paneId }
    this._crosshair = { ...cr, realX, kLineData, realDataIndex, dataIndex }
    if (
      prevCrosshair.x !== cr.x || prevCrosshair.y !== cr.y || prevCrosshair.paneId !== cr.paneId
    ) {
      if (kLineData !== null && !(notExecuteAction ?? false)) {
        this._chartStore.getChart().crosshairChange(this._crosshair)
      }
      if (!(notInvalidate ?? false)) {
        this._chartStore.getChart().updatePane(UpdateLevel.Overlay)
      }
    }
  }

  /**
   * 重新计算十字光标
   * @param notInvalidate
   */
  recalculateCrosshair (notInvalidate         )       {
    this.setCrosshair(this._crosshair, { notInvalidate })
  }

  /**
   * 获取crosshair信息
   * @returns
   */
  getCrosshair ()            {
    return this._crosshair
  }

  setActiveIcon (icon              )       {
    this._activeIcon = icon ?? null
  }

  getActiveIcon ()                        {
    return this._activeIcon
  }

  clear ()       {
    this.setCrosshair({}, { notInvalidate: true })
    this.setActiveIcon()
  }
}


},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => AxisView });
const $mod0 = $load(66);
const View = $mod0.default;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */












class AxisView                        extends View    {
           drawImp (ctx                          )       {
    const widget = this.getWidget()
    const pane = widget.getPane()
    const bounding = widget.getBounding()
    const axis = pane.getAxisComponent()
    const styles            = this.getAxisStyles(pane.getChart().getStyles())
    if (styles.show) {
      if (styles.axisLine.show) {
        this.createFigure({
          name: 'line',
          attrs: this.createAxisLine(bounding, styles),
          styles: styles.axisLine
        })?.draw(ctx)
      }
      const ticks = axis.getTicks()
      if (styles.tickLine.show) {
        const lines = this.createTickLines(ticks, bounding, styles)
        lines.forEach(line => {
          this.createFigure({
            name: 'line',
            attrs: line,
            styles: styles.tickLine
          })?.draw(ctx)
        })
      }
      if (styles.tickText.show) {
        const texts = this.createTickTexts(ticks, bounding, styles)
        this.createFigure({
          name: 'text',
          attrs: texts,
          styles: styles.tickText
        })?.draw(ctx)
      }
    }
  }






}


},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => CandleAreaView });
const $mod0 = $load(5);
const Animation = $mod0.default;
const $mod2 = $load(87);
const isNumber = $mod2.isNumber;
const isArray = $mod2.isArray;
const isValid = $mod2.isValid;
const $mod6 = $load(26);
const UpdateLevel = $mod6.UpdateLevel;
const $mod8 = $load(55);
const ChildrenView = $mod8.default;
const $mod10 = $load(91);
const lineTo = $mod10.lineTo;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */













class CandleAreaView extends ChildrenView {
                   _ripplePoint = this.createFigure({
    name: 'circle',
    attrs: {
      x: 0,
      y: 0,
      r: 0
    },
    styles: {
      style: 'fill'
    }
  })

          _animationFrameTime = 0

                   _animation = new Animation({ iterationCount: Infinity }).doFrame((time) => {
    this._animationFrameTime = time
    const pane = this.getWidget().getPane()
    pane.getChart().updatePane(UpdateLevel.Main, pane.getId())
  })

           drawImp (ctx                          )       {
    const widget = this.getWidget()
    const pane = widget.getPane()
    const chart = pane.getChart()
    const dataList = chart.getDataList()
    const lastDataIndex = dataList.length - 1
    const bounding = widget.getBounding()
    const yAxis = pane.getAxisComponent()
    const styles = chart.getStyles().candle.area
    const coordinates               = []
    let minY = Number.MAX_SAFE_INTEGER
    let areaStartX         = Number.MIN_SAFE_INTEGER
    let ripplePointCoordinate                       = null
    this.eachChildren((data             ) => {
      const { data: kLineData, x } = data
      const value = kLineData?.[styles.value]
      if (isNumber(value)) {
        const y = yAxis.convertToPixel(value)
        if (areaStartX === Number.MIN_SAFE_INTEGER) {
          areaStartX = x
        }
        coordinates.push({ x, y })
        minY = Math.min(minY, y)
        if (data.dataIndex === lastDataIndex) {
          ripplePointCoordinate = { x, y }
        }
      }
    })

    if (coordinates.length > 0) {
      this.createFigure({
        name: 'line',
        attrs: { coordinates },
        styles: {
          color: styles.lineColor,
          size: styles.lineSize,
          smooth: styles.smooth
        }
      }
      )?.draw(ctx)

      // render area
      const backgroundColor = styles.backgroundColor
      let color
      if (isArray               (backgroundColor)) {
        const gradient = ctx.createLinearGradient(0, bounding.height, 0, minY)
        try {
          backgroundColor.forEach(({ offset, color }) => {
            gradient.addColorStop(offset, color)
          })
        } catch (e) {
        }
        color = gradient
      } else {
        color = backgroundColor
      }
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.moveTo(areaStartX, bounding.height)
      ctx.lineTo(coordinates[0].x, coordinates[0].y)
      lineTo(ctx, coordinates, styles.smooth)
      ctx.lineTo(coordinates[coordinates.length - 1].x, bounding.height)
      ctx.closePath()
      ctx.fill()
    }

    const pointStyles = styles.point
    if (pointStyles.show && isValid(ripplePointCoordinate)) {
      this.createFigure({
        name: 'circle',
        attrs: {
          x: ripplePointCoordinate .x,
          y: ripplePointCoordinate .y,
          r: pointStyles.radius
        },
        styles: {
          style: 'fill',
          color: pointStyles.color
        }
      })?.draw(ctx)
      let rippleRadius = pointStyles.rippleRadius
      if (pointStyles.animation) {
        rippleRadius = pointStyles.radius + this._animationFrameTime / pointStyles.animationDuration * (pointStyles.rippleRadius - pointStyles.radius)
        this._animation.setDuration(pointStyles.animationDuration).start()
      }
      this._ripplePoint
        ?.setAttrs({
          x: ripplePointCoordinate .x,
          y: ripplePointCoordinate .y,
          r: rippleRadius
        })
        .setStyles({ style: 'fill', color: pointStyles.rippleColor }).draw(ctx)
    } else {
      this.stopAnimation()
    }
  }

  stopAnimation ()       {
    this._animation.stop()
  }
}


},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => CandleBarView });
const $mod0 = $load(4);
const ActionType = $mod0.ActionType;
const $mod2 = $load(23);
const CandleType = $mod2.CandleType;
const PolygonType = $mod2.PolygonType;
const $mod5 = $load(55);
const ChildrenView = $mod5.default;
const $mod7 = $load(40);
const PaneIdConstants = $mod7.PaneIdConstants;
const $mod9 = $load(87);
const isValid = $mod9.isValid;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */























class CandleBarView extends ChildrenView {
                   _boundCandleBarClickEvent = (data             ) => () => {
    this.getWidget().getPane().getChart().getChartStore().getActionStore().execute(ActionType.OnCandleBarClick, data)
    return false
  }

           drawImp (ctx                          )       {
    const pane = this.getWidget().getPane()
    const isMain = pane.getId() === PaneIdConstants.CANDLE
    const chartStore = pane.getChart().getChartStore()
    const candleBarOptions = this.getCandleBarOptions(chartStore)
    if (candleBarOptions !== null) {
      let ohlcSize = 0
      let halfOhlcSize = 0
      if (candleBarOptions.type === CandleType.Ohlc) {
        const { gapBar } = chartStore.getTimeScaleStore().getBarSpace()
        ohlcSize = Math.min(Math.max(Math.round(gapBar * 0.2), 1), 8)
        if (ohlcSize > 2 && ohlcSize % 2 === 1) {
          ohlcSize--
        }
        halfOhlcSize = Math.floor(halfOhlcSize / 2)
      }
      const yAxis = pane.getAxisComponent()
      this.eachChildren((data, barSpace) => {
        const { data: kLineData, x } = data
        if (isValid(kLineData)) {
          const { open, high, low, close } = kLineData
          const { type, styles } = candleBarOptions
          const colors           = []
          if (close > open) {
            colors[0] = styles.upColor
            colors[1] = styles.upBorderColor
            colors[2] = styles.upWickColor
          } else if (close < open) {
            colors[0] = styles.downColor
            colors[1] = styles.downBorderColor
            colors[2] = styles.downWickColor
          } else {
            colors[0] = styles.noChangeColor
            colors[1] = styles.noChangeBorderColor
            colors[2] = styles.noChangeWickColor
          }
          const openY = yAxis.convertToPixel(open)
          const closeY = yAxis.convertToPixel(close)
          const priceY = [
            openY, closeY,
            yAxis.convertToPixel(high),
            yAxis.convertToPixel(low)
          ]
          priceY.sort((a, b) => a - b)

          let rects                                                                   = []
          switch (type) {
            case CandleType.CandleSolid: {
              rects = this._createSolidBar(x, priceY, barSpace, colors)
              break
            }
            case CandleType.CandleStroke: {
              rects = this._createStrokeBar(x, priceY, barSpace, colors)
              break
            }
            case CandleType.CandleUpStroke: {
              if (close > open) {
                rects = this._createStrokeBar(x, priceY, barSpace, colors)
              } else {
                rects = this._createSolidBar(x, priceY, barSpace, colors)
              }
              break
            }
            case CandleType.CandleDownStroke: {
              if (open > close) {
                rects = this._createStrokeBar(x, priceY, barSpace, colors)
              } else {
                rects = this._createSolidBar(x, priceY, barSpace, colors)
              }
              break
            }
            case CandleType.Ohlc: {
              rects = [
                {
                  name: 'rect',
                  attrs: [
                    {
                      x: x - halfOhlcSize,
                      y: priceY[0],
                      width: ohlcSize,
                      height: priceY[3] - priceY[0]
                    },
                    {
                      x: x - barSpace.halfGapBar,
                      y: openY + ohlcSize > priceY[3] ? priceY[3] - ohlcSize : openY,
                      width: barSpace.halfGapBar,
                      height: ohlcSize
                    },
                    {
                      x: x + halfOhlcSize,
                      y: closeY + ohlcSize > priceY[3] ? priceY[3] - ohlcSize : closeY,
                      width: barSpace.halfGapBar - halfOhlcSize,
                      height: ohlcSize
                    }
                  ],
                  styles: { color: colors[0] }
                }
              ]
              break
            }
          }
          rects.forEach(rect => {
            let handler
            if (isMain) {
              handler = {
                mouseClickEvent: this._boundCandleBarClickEvent(data)
              }
            }
            this.createFigure(rect, handler)?.draw(ctx)
          })
        }
      })
    }
  }

            getCandleBarOptions (chartStore            )                             {
    const candleStyles = chartStore.getStyles().candle
    return {
      type: candleStyles.type                                        ,
      styles: candleStyles.bar
    }
  }

          _createSolidBar (x        , priceY          , barSpace          , colors          )                                                                   {
    return [
      {
        name: 'rect',
        attrs: {
          x,
          y: priceY[0],
          width: 1,
          height: priceY[3] - priceY[0]
        },
        styles: { color: colors[2] }
      },
      {
        name: 'rect',
        attrs: {
          x: x - barSpace.halfGapBar,
          y: priceY[1],
          width: barSpace.gapBar,
          height: Math.max(1, priceY[2] - priceY[1])
        },
        styles: {
          style: PolygonType.StrokeFill,
          color: colors[0],
          borderColor: colors[1]
        }
      }
    ]
  }

          _createStrokeBar (x        , priceY          , barSpace          , colors          )                                                                   {
    return [
      {
        name: 'rect',
        attrs: [
          {
            x,
            y: priceY[0],
            width: 1,
            height: priceY[1] - priceY[0]
          },
          {
            x,
            y: priceY[2],
            width: 1,
            height: priceY[3] - priceY[2]
          }
        ],
        styles: { color: colors[2] }
      },
      {
        name: 'rect',
        attrs: {
          x: x - barSpace.halfGapBar,
          y: priceY[1],
          width: barSpace.gapBar,
          height: Math.max(1, priceY[2] - priceY[1])
        },
        styles: {
          style: PolygonType.Stroke,
          borderColor: colors[1]
        }
      }
    ]
  }
}


},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => CandleHighLowPriceView });
const $mod0 = $load(55);
const ChildrenView = $mod0.default;
const $mod2 = $load(81);
const formatPrecision = $mod2.formatPrecision;
const formatThousands = $mod2.formatThousands;
const formatFoldDecimal = $mod2.formatFoldDecimal;
const $mod6 = $load(87);
const isValid = $mod6.isValid;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */










class CandleHighLowPriceView extends ChildrenView {
           drawImp (ctx                          )       {
    const widget = this.getWidget()
    const pane = widget.getPane()
    const chartStore = pane.getChart().getChartStore()
    const priceMarkStyles = chartStore.getStyles().candle.priceMark
    const highPriceMarkStyles = priceMarkStyles.high
    const lowPriceMarkStyles = priceMarkStyles.low
    if (priceMarkStyles.show && (highPriceMarkStyles.show || lowPriceMarkStyles.show)) {
      const thousandsSeparator = chartStore.getThousandsSeparator()
      const decimalFoldThreshold = chartStore.getDecimalFoldThreshold()
      const precision = chartStore.getPrecision()
      const yAxis = pane.getAxisComponent()
      let high = Number.MIN_SAFE_INTEGER
      let highX = 0
      let low = Number.MAX_SAFE_INTEGER
      let lowX = 0
      this.eachChildren((data             ) => {
        const { data: kLineData, x } = data
        if (isValid(kLineData)) {
          if (high < kLineData.high) {
            high = kLineData.high
            highX = x
          }
          if (low > kLineData.low) {
            low = kLineData.low
            lowX = x
          }
        }
      })
      const highY = yAxis.convertToPixel(high)
      const lowY = yAxis.convertToPixel(low)
      if (highPriceMarkStyles.show && high !== Number.MIN_SAFE_INTEGER) {
        this._drawMark(
          ctx,
          formatFoldDecimal(formatThousands(formatPrecision(high, precision.price), thousandsSeparator), decimalFoldThreshold),
          { x: highX, y: highY },
          highY < lowY ? [-2, -5] : [2, 5],
          highPriceMarkStyles
        )
      }
      if (lowPriceMarkStyles.show && low !== Number.MAX_SAFE_INTEGER) {
        this._drawMark(
          ctx,
          formatFoldDecimal(formatThousands(formatPrecision(low, precision.price), thousandsSeparator), decimalFoldThreshold),
          { x: lowX, y: lowY },
          highY < lowY ? [2, 5] : [-2, -5],
          lowPriceMarkStyles
        )
      }
    }
  }

          _drawMark (
    ctx                          ,
    text        ,
    coordinate            ,
    offsets          ,
    styles
  )       {
    const startX = coordinate.x
    const startY = coordinate.y + offsets[0]
    this.createFigure({
      name: 'line',
      attrs: {
        coordinates: [
          { x: startX - 2, y: startY + offsets[0] },
          { x: startX, y: startY },
          { x: startX + 2, y: startY + offsets[0] }
        ]
      },
      styles: { color: styles.color }
    })?.draw(ctx)

    let lineEndX
    let textStartX
    let textAlign
    const { width } = this.getWidget().getBounding()
    if (startX > width / 2) {
      lineEndX = startX - 5
      textStartX = lineEndX - styles.textOffset
      textAlign = 'right'
    } else {
      lineEndX = startX + 5
      textAlign = 'left'
      textStartX = lineEndX + styles.textOffset
    }

    const y = startY + offsets[1]
    this.createFigure({
      name: 'line',
      attrs: {
        coordinates: [
          { x: startX, y: startY },
          { x: startX, y },
          { x: lineEndX, y }
        ]
      },
      styles: { color: styles.color }
    })?.draw(ctx)
    this.createFigure({
      name: 'text',
      attrs: {
        x: textStartX,
        y,
        text,
        align: textAlign,
        baseline: 'middle'
      },
      styles: {
        color: styles.color,
        size: styles.textSize,
        family: styles.textFamily,
        weight: styles.textWeight
      }
    })?.draw(ctx)
  }
}


},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => CandleLastPriceLabelView });
const $mod0 = $load(23);
const YAxisType = $mod0.YAxisType;
const $mod2 = $load(81);
const formatPrecision = $mod2.formatPrecision;
const formatThousands = $mod2.formatThousands;
const formatFoldDecimal = $mod2.formatFoldDecimal;
const $mod6 = $load(87);
const isValid = $mod6.isValid;
const $mod8 = $load(66);
const View = $mod8.default;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */









class CandleLastPriceLabelView extends View {
           drawImp (ctx                          )       {
    const widget = this.getWidget()
    const pane = widget.getPane()
    const bounding = widget.getBounding()
    const chartStore = pane.getChart().getChartStore()
    const priceMarkStyles = chartStore.getStyles().candle.priceMark
    const lastPriceMarkStyles = priceMarkStyles.last
    const lastPriceMarkTextStyles = lastPriceMarkStyles.text
    if (priceMarkStyles.show && lastPriceMarkStyles.show && lastPriceMarkTextStyles.show) {
      const precision = chartStore.getPrecision()
      const yAxis = pane.getAxisComponent()
      const dataList = chartStore.getDataList()
      const data = dataList[dataList.length - 1]
      if (isValid(data)) {
        const { close, open } = data
        const priceY = yAxis.convertToNicePixel(close)
        let backgroundColor
        if (close > open) {
          backgroundColor = lastPriceMarkStyles.upColor
        } else if (close < open) {
          backgroundColor = lastPriceMarkStyles.downColor
        } else {
          backgroundColor = lastPriceMarkStyles.noChangeColor
        }
        let text
        if (yAxis.getType() === YAxisType.Percentage) {
          const fromData = chartStore.getVisibleFirstData()
          const fromClose = fromData .close
          text = `${((close - fromClose) / fromClose * 100).toFixed(2)}%`
        } else {
          text = formatPrecision(close, precision.price)
        }
        text = formatFoldDecimal(formatThousands(text, chartStore.getThousandsSeparator()), chartStore.getDecimalFoldThreshold())
        let x
        let textAlgin
        if (yAxis.isFromZero()) {
          x = 0
          textAlgin = 'left'
        } else {
          x = bounding.width
          textAlgin = 'right'
        }
        this.createFigure({
          name: 'text',
          attrs: {
            x,
            y: priceY,
            text,
            align: textAlgin,
            baseline: 'middle'
          },
          styles: {
            ...lastPriceMarkTextStyles,
            backgroundColor
          }
        })?.draw(ctx)
      }
    }
  }
}


},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => CandleLastPriceView });
const $mod0 = $load(66);
const View = $mod0.default;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */





class CandleLastPriceView extends View {
           drawImp (ctx                          )       {
    const widget = this.getWidget()
    const pane = widget.getPane()
    const bounding = widget.getBounding()
    const chartStore = pane.getChart().getChartStore()
    const priceMarkStyles = chartStore.getStyles().candle.priceMark
    const lastPriceMarkStyles = priceMarkStyles.last
    const lastPriceMarkLineStyles = lastPriceMarkStyles.line
    if (priceMarkStyles.show && lastPriceMarkStyles.show && lastPriceMarkLineStyles.show) {
      const yAxis = pane.getAxisComponent()
      const dataList = chartStore.getDataList()
      const data = dataList[dataList.length - 1]
      if (data != null) {
        const { close, open } = data
        const priceY = yAxis.convertToNicePixel(close)
        let color
        if (close > open) {
          color = lastPriceMarkStyles.upColor
        } else if (close < open) {
          color = lastPriceMarkStyles.downColor
        } else {
          color = lastPriceMarkStyles.noChangeColor
        }
        this.createFigure({
          name: 'line',
          attrs: {
            coordinates: [
              { x: 0, y: priceY },
              { x: bounding.width, y: priceY }
            ]
          },
          styles: {
            style: lastPriceMarkLineStyles.style,
            color,
            size: lastPriceMarkLineStyles.size,
            dashedValue: lastPriceMarkLineStyles.dashedValue
          }
        })?.draw(ctx)
      }
    }
  }
}


},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => CandleTooltipView });
const $mod0 = $load(23);
const TooltipShowType = $mod0.TooltipShowType;
const CandleTooltipRectPosition = $mod0.CandleTooltipRectPosition;
const YAxisPosition = $mod0.YAxisPosition;
const PolygonType = $mod0.PolygonType;
const $mod5 = $load(81);
const formatPrecision = $mod5.formatPrecision;
const formatThousands = $mod5.formatThousands;
const formatFoldDecimal = $mod5.formatFoldDecimal;
const $mod9 = $load(77);
const createFont = $mod9.createFont;
const $mod11 = $load(87);
const isFunction = $mod11.isFunction;
const isObject = $mod11.isObject;
const isValid = $mod11.isValid;
const $mod15 = $load(3);
const FormatDateType = $mod15.FormatDateType;
const $mod17 = $load(40);
const PaneIdConstants = $mod17.PaneIdConstants;
const $mod19 = $load(61);
const IndicatorTooltipView = $mod19.default;
const $mod21 = $load(97);
const i18n = $mod21.i18n;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */























class CandleTooltipView extends IndicatorTooltipView {
           drawImp (ctx                          )       {
    const widget = this.getWidget()
    const pane = widget.getPane()
    const paneId = pane.getId()
    const chartStore = pane.getChart().getChartStore()
    const crosshair = chartStore.getTooltipStore().getCrosshair()
    if (isValid(crosshair.kLineData)) {
      const bounding = widget.getBounding()
      const yAxisBounding = pane.getYAxisWidget() .getBounding()
      const dataList = chartStore.getDataList()
      const precision = chartStore.getPrecision()
      const locale = chartStore.getLocale()
      const customApi = chartStore.getCustomApi()
      const thousandsSeparator = chartStore.getThousandsSeparator()
      const decimalFoldThreshold = chartStore.getDecimalFoldThreshold()
      const activeIcon = chartStore.getTooltipStore().getActiveIcon()
      const indicators = chartStore.getIndicatorStore().getInstances(pane.getId())
      const dateTimeFormat = chartStore.getTimeScaleStore().getDateTimeFormat()
      const styles = chartStore.getStyles()
      const candleStyles = styles.candle
      const indicatorStyles = styles.indicator
      if (
        candleStyles.tooltip.showType === TooltipShowType.Rect &&
        indicatorStyles.tooltip.showType === TooltipShowType.Rect
      ) {
        const isDrawCandleTooltip = this.isDrawTooltip(crosshair, candleStyles.tooltip)
        const isDrawIndicatorTooltip = this.isDrawTooltip(crosshair, indicatorStyles.tooltip)
        this._drawRectTooltip(
          ctx, dataList, indicators,
          bounding, yAxisBounding,
          crosshair, precision,
          dateTimeFormat, locale, customApi, thousandsSeparator, decimalFoldThreshold,
          isDrawCandleTooltip, isDrawIndicatorTooltip,
          candleStyles.tooltip.offsetTop, styles
        )
      } else if (
        candleStyles.tooltip.showType === TooltipShowType.Standard &&
        indicatorStyles.tooltip.showType === TooltipShowType.Standard
      ) {
        const { offsetLeft, offsetTop, offsetRight } = candleStyles.tooltip
        const maxWidth = bounding.width - offsetRight
        const top = this._drawCandleStandardTooltip(
          ctx, dataList, paneId, crosshair, activeIcon, precision,
          dateTimeFormat, locale, customApi, thousandsSeparator, decimalFoldThreshold,
          offsetLeft, offsetTop, maxWidth, candleStyles
        )
        this.drawIndicatorTooltip(
          ctx, paneId, dataList, crosshair,
          activeIcon, indicators, customApi,
          thousandsSeparator, decimalFoldThreshold,
          offsetLeft, top, maxWidth, indicatorStyles
        )
      } else if (
        candleStyles.tooltip.showType === TooltipShowType.Rect &&
        indicatorStyles.tooltip.showType === TooltipShowType.Standard
      ) {
        const { offsetLeft, offsetTop, offsetRight } = candleStyles.tooltip
        const maxWidth = bounding.width - offsetRight
        const top = this.drawIndicatorTooltip(
          ctx, paneId, dataList, crosshair,
          activeIcon, indicators, customApi,
          thousandsSeparator, decimalFoldThreshold,
          offsetLeft, offsetTop, maxWidth, indicatorStyles
        )
        const isDrawCandleTooltip = this.isDrawTooltip(crosshair, candleStyles.tooltip)
        this._drawRectTooltip(
          ctx, dataList, indicators,
          bounding, yAxisBounding,
          crosshair, precision, dateTimeFormat,
          locale, customApi, thousandsSeparator, decimalFoldThreshold,
          isDrawCandleTooltip, false, top, styles
        )
      } else {
        const { offsetLeft, offsetTop, offsetRight } = candleStyles.tooltip
        const maxWidth = bounding.width - offsetRight
        const top = this._drawCandleStandardTooltip(
          ctx, dataList, paneId, crosshair, activeIcon, precision,
          dateTimeFormat, locale, customApi, thousandsSeparator, decimalFoldThreshold,
          offsetLeft, offsetTop, maxWidth, candleStyles
        )
        const isDrawIndicatorTooltip = this.isDrawTooltip(crosshair, indicatorStyles.tooltip)
        this._drawRectTooltip(
          ctx, dataList, indicators,
          bounding, yAxisBounding,
          crosshair, precision, dateTimeFormat,
          locale, customApi, thousandsSeparator, decimalFoldThreshold,
          false, isDrawIndicatorTooltip, top, styles
        )
      }
    }
  }

          _drawCandleStandardTooltip (
    ctx                          ,
    dataList             ,
    paneId        ,
    crosshair           ,
    activeTooltipIcon                       ,
    precision           ,
    dateTimeFormat                     ,
    locale        ,
    customApi           ,
    thousandsSeparator        ,
    decimalFoldThreshold        ,
    left        ,
    top        ,
    maxWidth        ,
    styles
  )         {
    const tooltipStyles = styles.tooltip
    const tooltipTextStyles = tooltipStyles.text
    let prevRowHeight = 0
    const coordinate = { x: left, y: top }
    if (this.isDrawTooltip(crosshair, tooltipStyles)) {
      const dataIndex = crosshair.dataIndex ?? 0
      const legends = this._getCandleTooltipLegends(
        { prev: dataList[dataIndex - 1] ?? null, current: crosshair.kLineData , next: dataList[dataIndex + 1] ?? null },
        precision, dateTimeFormat, locale, customApi, thousandsSeparator, decimalFoldThreshold, styles
      )

      const [leftIcons, middleIcons, rightIcons] = this.classifyTooltipIcons(tooltipStyles.icons)

      prevRowHeight = this.drawStandardTooltipIcons(
        ctx, activeTooltipIcon, leftIcons, coordinate,
        paneId, '', left, prevRowHeight, maxWidth
      )

      prevRowHeight = this.drawStandardTooltipIcons(
        ctx, activeTooltipIcon, middleIcons, coordinate,
        paneId, '', left, prevRowHeight, maxWidth
      )

      if (legends.length > 0) {
        prevRowHeight = this.drawStandardTooltipLegends(
          ctx, legends, coordinate, left,
          prevRowHeight, maxWidth, tooltipTextStyles
        )
      }

      prevRowHeight = this.drawStandardTooltipIcons(
        ctx, activeTooltipIcon, rightIcons, coordinate,
        paneId, '', left, prevRowHeight, maxWidth
      )
    }
    return coordinate.y + prevRowHeight
  }

          _drawRectTooltip (
    ctx                          ,
    dataList             ,
    indicators             ,
    bounding          ,
    yAxisBounding          ,
    crosshair           ,
    precision           ,
    dateTimeFormat                     ,
    locale        ,
    customApi           ,
    thousandsSeparator        ,
    decimalFoldThreshold        ,
    isDrawCandleTooltip         ,
    isDrawIndicatorTooltip         ,
    top        ,
    styles
  )       {
    const candleStyles = styles.candle
    const indicatorStyles = styles.indicator
    const candleTooltipStyles = candleStyles.tooltip
    const indicatorTooltipStyles = indicatorStyles.tooltip
    if (isDrawCandleTooltip || isDrawIndicatorTooltip) {
      const dataIndex = crosshair.dataIndex ?? 0
      const candleLegends = this._getCandleTooltipLegends(
        { prev: dataList[dataIndex - 1] ?? null, current: crosshair.kLineData , next: dataList[dataIndex + 1] ?? null },
        precision, dateTimeFormat, locale, customApi, thousandsSeparator, decimalFoldThreshold, candleStyles
      )

      const { offsetLeft, offsetTop, offsetRight, offsetBottom } = candleTooltipStyles

      const {
        marginLeft: baseTextMarginLeft,
        marginRight: baseTextMarginRight,
        marginTop: baseTextMarginTop,
        marginBottom: baseTextMarginBottom,
        size: baseTextSize,
        weight: baseTextWeight,
        family: baseTextFamily
      } = candleTooltipStyles.text

      const {
        position: rectPosition,
        paddingLeft: rectPaddingLeft,
        paddingRight: rectPaddingRight,
        paddingTop: rectPaddingTop,
        paddingBottom: rectPaddingBottom,
        offsetLeft: rectOffsetLeft,
        offsetRight: rectOffsetRight,
        offsetTop: rectOffsetTop,
        offsetBottom: rectOffsetBottom,
        borderSize: rectBorderSize,
        borderRadius: rectBorderRadius,
        borderColor: rectBorderColor,
        color: rectBackgroundColor
      } = candleTooltipStyles.rect

      let maxTextWidth = 0
      let rectWidth = 0
      let rectHeight = 0
      if (isDrawCandleTooltip) {
        ctx.font = createFont(baseTextSize, baseTextWeight, baseTextFamily)
        candleLegends.forEach(data => {
          const title = data.title
          const value = data.value
          const text = `${title.text}${value.text}`
          const labelWidth = ctx.measureText(text).width + baseTextMarginLeft + baseTextMarginRight
          maxTextWidth = Math.max(maxTextWidth, labelWidth)
        })
        rectHeight += ((baseTextMarginBottom + baseTextMarginTop + baseTextSize) * candleLegends.length)
      }

      const {
        marginLeft: indicatorTextMarginLeft,
        marginRight: indicatorTextMarginRight,
        marginTop: indicatorTextMarginTop,
        marginBottom: indicatorTextMarginBottom,
        size: indicatorTextSize,
        weight: indicatorTextWeight,
        family: indicatorTextFamily
      } = indicatorTooltipStyles.text
      const indicatorLegendsArray                    = []
      if (isDrawIndicatorTooltip) {
        ctx.font = createFont(indicatorTextSize, indicatorTextWeight, indicatorTextFamily)
        indicators.forEach(indicator => {
          const tooltipDataValues = this.getIndicatorTooltipData(dataList, crosshair, indicator, customApi, thousandsSeparator, decimalFoldThreshold, indicatorStyles).values ?? []
          indicatorLegendsArray.push(tooltipDataValues)
          tooltipDataValues.forEach(data => {
            const title = data.title
            const value = data.value
            const text = `${title.text}${value.text}`
            const textWidth = ctx.measureText(text).width + indicatorTextMarginLeft + indicatorTextMarginRight
            maxTextWidth = Math.max(maxTextWidth, textWidth)
            rectHeight += (indicatorTextMarginTop + indicatorTextMarginBottom + indicatorTextSize)
          })
        })
      }
      rectWidth += maxTextWidth
      if (rectWidth !== 0 && rectHeight !== 0) {
        rectWidth += (rectBorderSize * 2 + rectPaddingLeft + rectPaddingRight)
        rectHeight += (rectBorderSize * 2 + rectPaddingTop + rectPaddingBottom)
        const centerX = bounding.width / 2
        const isPointer = rectPosition === CandleTooltipRectPosition.Pointer && crosshair.paneId === PaneIdConstants.CANDLE
        const isLeft = (crosshair.realX ?? 0) > centerX
        let rectX         = 0
        if (isPointer) {
          const realX = crosshair.realX
          if (isLeft) {
            rectX = realX - rectOffsetRight - rectWidth
          } else {
            rectX = realX + rectOffsetLeft
          }
        } else {
          if (isLeft) {
            rectX = rectOffsetLeft + offsetLeft
            if (styles.yAxis.inside && styles.yAxis.position === YAxisPosition.Left) {
              rectX += yAxisBounding.width
            }
          } else {
            rectX = bounding.width - rectOffsetRight - rectWidth - offsetRight
            if (styles.yAxis.inside && styles.yAxis.position === YAxisPosition.Right) {
              rectX -= yAxisBounding.width
            }
          }
        }

        let rectY = top + rectOffsetTop
        if (isPointer) {
          const y = crosshair.y
          rectY = y - rectHeight / 2
          if (rectY + rectHeight > bounding.height - rectOffsetBottom - offsetBottom) {
            rectY = bounding.height - rectOffsetBottom - rectHeight - offsetBottom
          }
          if (rectY < top + rectOffsetTop) {
            rectY = top + rectOffsetTop + offsetTop
          }
        }
        this.createFigure({
          name: 'rect',
          attrs: {
            x: rectX,
            y: rectY,
            width: rectWidth,
            height: rectHeight
          },
          styles: {
            style: PolygonType.StrokeFill,
            color: rectBackgroundColor,
            borderColor: rectBorderColor,
            borderSize: rectBorderSize,
            borderRadius: rectBorderRadius
          }
        })?.draw(ctx)
        const candleTextX = rectX + rectBorderSize + rectPaddingLeft + baseTextMarginLeft
        let textY = rectY + rectBorderSize + rectPaddingTop
        if (isDrawCandleTooltip) {
          // render candle texts
          candleLegends.forEach(data => {
            textY += baseTextMarginTop
            const title = data.title
            this.createFigure({
              name: 'text',
              attrs: {
                x: candleTextX,
                y: textY,
                text: title.text
              },
              styles: {
                color: title.color,
                size: baseTextSize,
                family: baseTextFamily,
                weight: baseTextWeight
              }
            })?.draw(ctx)
            const value = data.value
            this.createFigure({
              name: 'text',
              attrs: {
                x: rectX + rectWidth - rectBorderSize - baseTextMarginRight - rectPaddingRight,
                y: textY,
                text: value.text,
                align: 'right'
              },
              styles: {
                color: value.color,
                size: baseTextSize,
                family: baseTextFamily,
                weight: baseTextWeight
              }
            })?.draw(ctx)
            textY += (baseTextSize + baseTextMarginBottom)
          })
        }
        if (isDrawIndicatorTooltip) {
          // render indicator texts
          const indicatorTextX = rectX + rectBorderSize + rectPaddingLeft + indicatorTextMarginLeft
          indicatorLegendsArray.forEach(legends => {
            legends.forEach(data => {
              textY += indicatorTextMarginTop
              const title = data.title
              const value = data.value
              this.createFigure({
                name: 'text',
                attrs: {
                  x: indicatorTextX,
                  y: textY,
                  text: title.text
                },
                styles: {
                  color: title.color,
                  size: indicatorTextSize,
                  family: indicatorTextFamily,
                  weight: indicatorTextWeight
                }
              })?.draw(ctx)

              this.createFigure({
                name: 'text',
                attrs: {
                  x: rectX + rectWidth - rectBorderSize - indicatorTextMarginRight - rectPaddingRight,
                  y: textY,
                  text: value.text,
                  align: 'right'
                },
                styles: {
                  color: value.color,
                  size: indicatorTextSize,
                  family: indicatorTextFamily,
                  weight: indicatorTextWeight
                }
              })?.draw(ctx)
              textY += (indicatorTextSize + indicatorTextMarginBottom)
            })
          })
        }
      }
    }
  }

          _getCandleTooltipLegends (
    data                                 ,
    precision           ,
    dateTimeFormat                     ,
    locale        ,
    customApi           ,
    thousandsSeparator        ,
    decimalFoldThreshold        ,
    styles
  )                  {
    const tooltipStyles = styles.tooltip
    const textColor = tooltipStyles.text.color
    const current = data.current
    const prevClose = data.prev?.close ?? current.close
    const changeValue = current.close - prevClose
    const { price: pricePrecision, volume: volumePrecision } = precision
    const mapping = {
      '{time}': customApi.formatDate(dateTimeFormat, current.timestamp, 'YYYY-MM-DD HH:mm', FormatDateType.Tooltip),
      '{open}': formatFoldDecimal(formatThousands(formatPrecision(current.open, pricePrecision), thousandsSeparator), decimalFoldThreshold),
      '{high}': formatFoldDecimal(formatThousands(formatPrecision(current.high, pricePrecision), thousandsSeparator), decimalFoldThreshold),
      '{low}': formatFoldDecimal(formatThousands(formatPrecision(current.low, pricePrecision), thousandsSeparator), decimalFoldThreshold),
      '{close}': formatFoldDecimal(formatThousands(formatPrecision(current.close, pricePrecision), thousandsSeparator), decimalFoldThreshold),
      '{volume}': formatFoldDecimal(formatThousands(
        customApi.formatBigNumber(formatPrecision(current.volume ?? tooltipStyles.defaultValue, volumePrecision)),
        thousandsSeparator
      ), decimalFoldThreshold),
      '{turnover}': formatFoldDecimal(formatThousands(
        formatPrecision(current.turnover ?? tooltipStyles.defaultValue, pricePrecision),
        thousandsSeparator
      ), decimalFoldThreshold),
      '{change}': prevClose === 0 ? tooltipStyles.defaultValue : `${formatThousands(formatPrecision(changeValue / prevClose * 100), thousandsSeparator)}%`
    }
    const legends = (
      isFunction(tooltipStyles.custom)
        ? tooltipStyles.custom(data, styles)
        : tooltipStyles.custom
    ) ?? []
    return legends.map(({ title, value }) => {
      let t                     = { text: '', color: '' }
      if (isObject(title)) {
        t = { ...title }
      } else {
        t.text = title
        t.color = textColor
      }
      t.text = i18n(t.text, locale)
      let v                     = { text: tooltipStyles.defaultValue, color: '' }
      if (isObject(value)) {
        v = { ...value }
      } else {
        v.text = value
        v.color = textColor
      }
      const match = v.text.match(/{(\S*)}/)
      if (match !== null && match.length > 1) {
        const key = `{${match[1]}}`
        v.text = v.text.replace(key, (mapping[key] ?? tooltipStyles.defaultValue)          )
        if (key === '{change}') {
          v.color = changeValue === 0 ? styles.priceMark.last.noChangeColor : (changeValue > 0 ? styles.priceMark.last.upColor : styles.priceMark.last.downColor)
        }
      }
      return { title: t, value: v }
    })
  }
}


},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => ChildrenView });
const $mod0 = $load(66);
const View = $mod0.default;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */












class ChildrenView extends View        {
            eachChildren (childCallback                   )       {
    const pane = this.getWidget().getPane()
    const chartStore = pane.getChart().getChartStore()
    const visibleDataList = chartStore.getVisibleDataList()
    const barSpace = chartStore.getTimeScaleStore().getBarSpace()
    visibleDataList.forEach((data             , index        ) => {
      childCallback(data, barSpace, index)
    })
  }
}


},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => CrosshairHorizontalLabelView });
const $mod0 = $load(23);
const YAxisType = $mod0.YAxisType;
const $mod2 = $load(87);
const isString = $mod2.isString;
const $mod4 = $load(81);
const formatPrecision = $mod4.formatPrecision;
const formatThousands = $mod4.formatThousands;
const formatFoldDecimal = $mod4.formatFoldDecimal;
const $mod8 = $load(77);
const createFont = $mod8.createFont;
const $mod10 = $load(66);
const View = $mod10.default;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

















class CrosshairHorizontalLabelView                         extends View    {
           drawImp (ctx                          )       {
    const widget = this.getWidget()
    const pane = widget.getPane()
    const bounding = widget.getBounding()
    const chartStore = widget.getPane().getChart().getChartStore()
    const crosshair = chartStore.getTooltipStore().getCrosshair()
    const styles = chartStore.getStyles().crosshair
    if (isString(crosshair.paneId) && this.compare(crosshair, pane.getId())) {
      if (styles.show) {
        const directionStyles = this.getDirectionStyles(styles)
        const textStyles = directionStyles.text
        if (directionStyles.show && textStyles.show) {
          const axis = pane.getAxisComponent()
          const text = this.getText(crosshair, chartStore, axis)
          ctx.font = createFont(textStyles.size, textStyles.weight, textStyles.family)
          this.createFigure({
            name: 'text',
            attrs: this.getTextAttrs(text, ctx.measureText(text).width, crosshair, bounding, axis, textStyles),
            styles: textStyles
          })?.draw(ctx)
        }
      }
    }
  }

            compare (crosshair           , paneId        )          {
    return crosshair.paneId === paneId
  }

            getDirectionStyles (styles                )                          {
    return styles.horizontal
  }

            getText (crosshair           , chartStore            , axis      )         {
    const yAxis = axis
    const value = axis.convertFromPixel(crosshair.y )
    let text
    if (yAxis.getType() === YAxisType.Percentage) {
      const fromData = chartStore.getVisibleFirstData()
      text = `${((value - fromData .close) / fromData .close * 100).toFixed(2)}%`
    } else {
      const indicators = chartStore.getIndicatorStore().getInstances(crosshair.paneId )
      let precision = 0
      let shouldFormatBigNumber = false
      if (yAxis.isInCandle()) {
        precision = chartStore.getPrecision().price
      } else {
        indicators.forEach(indicator => {
          precision = Math.max(indicator.precision, precision)
          if (!shouldFormatBigNumber) {
            shouldFormatBigNumber = indicator.shouldFormatBigNumber
          }
        })
      }
      text = formatPrecision(value, precision)
      if (shouldFormatBigNumber) {
        text = chartStore.getCustomApi().formatBigNumber(text)
      }
    }
    return formatFoldDecimal(formatThousands(text, chartStore.getThousandsSeparator()), chartStore.getDecimalFoldThreshold())
  }

            getTextAttrs (text        , _textWidth        , crosshair           , bounding          , axis      , _styles                )            {
    const yAxis = axis
    let x
    let textAlign
    if (yAxis.isFromZero()) {
      x = 0
      textAlign = 'left'
    } else {
      x = bounding.width
      textAlign = 'right'
    }

    return { x, y: crosshair.y , text, align: textAlign, baseline: 'middle' }
  }
}


},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => CrosshairLineView });
const $mod0 = $load(87);
const isString = $mod0.isString;
const $mod2 = $load(66);
const View = $mod2.default;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */







class CrosshairLineView extends View {
           drawImp (ctx                          )       {
    const widget = this.getWidget()
    const pane = widget.getPane()
    const bounding = widget.getBounding()
    const chartStore = widget.getPane().getChart().getChartStore()
    const crosshair = chartStore.getTooltipStore().getCrosshair()
    const styles = chartStore.getStyles().crosshair
    if (isString(crosshair.paneId) && styles.show) {
      if (crosshair.paneId === pane.getId()) {
        const y = crosshair.y
        this._drawLine(
          ctx,
          [
            { x: 0, y },
            { x: bounding.width, y }
          ],
          styles.horizontal
        )
      }
      const x = crosshair.realX
      this._drawLine(
        ctx,
        [
          { x, y: 0 },
          { x, y: bounding.height }
        ],
        styles.vertical
      )
    }
  }

          _drawLine (ctx                          , coordinates              , styles                         )       {
    if (styles.show) {
      const lineStyles = styles.line
      if (lineStyles.show) {
        this.createFigure({
          name: 'line',
          attrs: { coordinates },
          styles: lineStyles
        })?.draw(ctx)
      }
    }
  }
}


},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => CrosshairVerticalLabelView });
const $mod0 = $load(87);
const isValid = $mod0.isValid;
const $mod2 = $load(3);
const FormatDateType = $mod2.FormatDateType;
const $mod4 = $load(56);
const CrosshairHorizontalLabelView = $mod4.default;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
















class CrosshairVerticalLabelView extends CrosshairHorizontalLabelView        {
           compare (crosshair           )          {
    return isValid(crosshair.kLineData) && crosshair.dataIndex === crosshair.realDataIndex
  }

           getDirectionStyles (styles                )                          {
    return styles.vertical
  }

           getText (crosshair           , chartStore            )         {
    const timestamp = crosshair.kLineData?.timestamp
    return chartStore.getCustomApi().formatDate(chartStore.getTimeScaleStore().getDateTimeFormat(), timestamp , 'YYYY-MM-DD HH:mm', FormatDateType.Crosshair)
  }

           getTextAttrs (text        , textWidth        , crosshair           , bounding          , _axis      , styles                )            {
    const x = crosshair.realX
    let optimalX
    let align                  = 'center'
    if (x - textWidth / 2 - styles.paddingLeft < 0) {
      optimalX = 0
      align = 'left'
    } else if (x + textWidth / 2 + styles.paddingRight > bounding.width) {
      optimalX = bounding.width
      align = 'right'
    } else {
      optimalX = x
    }
    return { x: optimalX, y: 0, text, align, baseline: 'top' }
  }
}


},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => GridView });
const $mod0 = $load(66);
const View = $mod0.default;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */





class GridView extends View {
           drawImp (ctx                          )       {
    const widget = this.getWidget()
    const pane = this.getWidget().getPane()
    const chart = pane.getChart()
    const bounding = widget.getBounding()

    const gridStyles = chart.getStyles().grid
    const show = gridStyles.show

    if (show) {
      ctx.save()
      ctx.globalCompositeOperation = 'destination-over'
      const horizontalStyles = gridStyles.horizontal
      const horizontalShow = horizontalStyles.show
      if (horizontalShow) {
        const yAxis = pane.getAxisComponent()
        const attrs              = yAxis.getTicks().map(tick => ({
          coordinates: [
            { x: 0, y: tick.coord },
            { x: bounding.width, y: tick.coord }
          ]
        }))
        this.createFigure({
          name: 'line',
          attrs,
          styles: horizontalStyles
        })?.draw(ctx)
      }
      const verticalStyles = gridStyles.vertical
      const verticalShow = verticalStyles.show
      if (verticalShow) {
        const xAxis = chart.getXAxisPane().getAxisComponent()
        const attrs              = xAxis.getTicks().map(tick => ({
          coordinates: [
            { x: tick.coord, y: 0 },
            { x: tick.coord, y: bounding.height }
          ]
        }))
        this.createFigure({
          name: 'line',
          attrs,
          styles: verticalStyles
        })?.draw(ctx)
      }
      ctx.restore()
    }
  }
}


},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => IndicatorLastValueView });
const $mod0 = $load(81);
const formatPrecision = $mod0.formatPrecision;
const formatThousands = $mod0.formatThousands;
const formatFoldDecimal = $mod0.formatFoldDecimal;
const $mod4 = $load(87);
const isNumber = $mod4.isNumber;
const isValid = $mod4.isValid;
const $mod7 = $load(31);
const eachFigures = $mod7.eachFigures;
const $mod9 = $load(66);
const View = $mod9.default;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */










class IndicatorLastValueView extends View        {
           drawImp (ctx                          )       {
    const widget = this.getWidget()
    const pane = widget.getPane()
    const bounding = widget.getBounding()
    const chartStore = pane.getChart().getChartStore()
    const customApi = chartStore.getCustomApi()
    const defaultStyles = chartStore.getStyles().indicator
    const lastValueMarkStyles = defaultStyles.lastValueMark
    const lastValueMarkTextStyles = lastValueMarkStyles.text
    if (lastValueMarkStyles.show) {
      const yAxis = pane.getAxisComponent()
      const dataList = chartStore.getDataList()
      const dataIndex = dataList.length - 1
      const indicators = chartStore.getIndicatorStore().getInstances(pane.getId())
      const thousandsSeparator = chartStore.getThousandsSeparator()
      const decimalFoldThreshold = chartStore.getDecimalFoldThreshold()
      indicators.forEach(indicator => {
        const result = indicator.result
        const indicatorData = result[dataIndex]
        if (isValid(indicatorData) && indicator.visible) {
          const precision = indicator.precision
          eachFigures(dataList, indicator, dataIndex, defaultStyles, (figure                 , figureStyles                                ) => {
            const value = indicatorData[figure.key]
            if (isNumber(value)) {
              const y = yAxis.convertToNicePixel(value)
              let text = formatPrecision(value, precision)
              if (indicator.shouldFormatBigNumber) {
                text = customApi.formatBigNumber(text)
              }
              text = formatFoldDecimal(formatThousands(text, thousandsSeparator), decimalFoldThreshold)
              let x
              let textAlign
              if (yAxis.isFromZero()) {
                x = 0
                textAlign = 'left'
              } else {
                x = bounding.width
                textAlign = 'right'
              }

              this.createFigure({
                name: 'text',
                attrs: {
                  x,
                  y,
                  text,
                  align: textAlign,
                  baseline: 'middle'
                },
                styles: {
                  ...lastValueMarkTextStyles,
                  backgroundColor: figureStyles.color
                }
              })?.draw(ctx)
            }
          })
        }
      })
    }
  }
}


},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => IndicatorTooltipView });
const $mod0 = $load(23);
const TooltipShowRule = $mod0.TooltipShowRule;
const TooltipIconPosition = $mod0.TooltipIconPosition;
const $mod3 = $load(4);
const ActionType = $mod3.ActionType;
const $mod5 = $load(81);
const formatPrecision = $mod5.formatPrecision;
const formatThousands = $mod5.formatThousands;
const formatFoldDecimal = $mod5.formatFoldDecimal;
const $mod9 = $load(87);
const isValid = $mod9.isValid;
const isObject = $mod9.isObject;
const isString = $mod9.isString;
const isNumber = $mod9.isNumber;
const $mod14 = $load(77);
const createFont = $mod14.createFont;
const $mod16 = $load(31);
const eachFigures = $mod16.eachFigures;
const $mod18 = $load(66);
const View = $mod18.default;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */























class IndicatorTooltipView extends View        {
                   _boundIconClickEvent = (currentIcon             ) => () => {
    const pane = this.getWidget().getPane()
    pane.getChart().getChartStore().getActionStore().execute(ActionType.OnTooltipIconClick, { ...currentIcon })
    return true
  }

                   _boundIconMouseMoveEvent = (currentIconInfo             ) => () => {
    const pane = this.getWidget().getPane()
    const tooltipStore = pane.getChart().getChartStore().getTooltipStore()
    tooltipStore.setActiveIcon({ ...currentIconInfo })
    return true
  }

           drawImp (ctx                          )       {
    const widget = this.getWidget()
    const pane = widget.getPane()
    const chartStore = pane.getChart().getChartStore()
    const crosshair = chartStore.getTooltipStore().getCrosshair()
    if (isValid(crosshair.kLineData)) {
      const bounding = widget.getBounding()
      const customApi = chartStore.getCustomApi()
      const thousandsSeparator = chartStore.getThousandsSeparator()
      const decimalFoldThreshold = chartStore.getDecimalFoldThreshold()
      const indicators = chartStore.getIndicatorStore().getInstances(pane.getId())
      const activeIcon = chartStore.getTooltipStore().getActiveIcon()
      const defaultStyles = chartStore.getStyles().indicator
      const { offsetLeft, offsetTop, offsetRight } = defaultStyles.tooltip
      this.drawIndicatorTooltip(
        ctx, pane.getId(), chartStore.getDataList(),
        crosshair, activeIcon, indicators, customApi,
        thousandsSeparator, decimalFoldThreshold,
        offsetLeft, offsetTop,
        bounding.width - offsetRight, defaultStyles
      )
    }
  }

            drawIndicatorTooltip (
    ctx                          ,
    paneId        ,
    dataList             ,
    crosshair           ,
    activeTooltipIcon                       ,
    indicators                ,
    customApi           ,
    thousandsSeparator        ,
    decimalFoldThreshold        ,
    left        ,
    top        ,
    maxWidth        ,
    styles
  )         {
    const tooltipStyles = styles.tooltip
    if (this.isDrawTooltip(crosshair, tooltipStyles)) {
      const tooltipTextStyles = tooltipStyles.text
      indicators.forEach(indicator => {
        let prevRowHeight = 0
        const coordinate = { x: left, y: top }
        const { name, calcParamsText, values: legends, icons } = this.getIndicatorTooltipData(dataList, crosshair, indicator, customApi, thousandsSeparator, decimalFoldThreshold, styles)
        const nameValid = name.length > 0
        const legendValid = legends.length > 0
        if (nameValid || legendValid) {
          const [leftIcons, middleIcons, rightIcons] = this.classifyTooltipIcons(icons)
          prevRowHeight = this.drawStandardTooltipIcons(
            ctx, activeTooltipIcon, leftIcons,
            coordinate, paneId, indicator.name,
            left, prevRowHeight, maxWidth
          )

          if (nameValid) {
            let text = name
            if (calcParamsText.length > 0) {
              text = `${text}${calcParamsText}`
            }
            prevRowHeight = this.drawStandardTooltipLegends(
              ctx,
              [
                {
                  title: { text: '', color: tooltipTextStyles.color },
                  value: { text, color: tooltipTextStyles.color }
                }
              ],
              coordinate, left, prevRowHeight, maxWidth, tooltipTextStyles
            )
          }

          prevRowHeight = this.drawStandardTooltipIcons(
            ctx, activeTooltipIcon, middleIcons,
            coordinate, paneId, indicator.name,
            left, prevRowHeight, maxWidth
          )

          if (legendValid) {
            prevRowHeight = this.drawStandardTooltipLegends(
              ctx, legends, coordinate,
              left, prevRowHeight, maxWidth, tooltipStyles.text
            )
          }

          // draw right icons
          prevRowHeight = this.drawStandardTooltipIcons(
            ctx, activeTooltipIcon, rightIcons,
            coordinate, paneId, indicator.name,
            left, prevRowHeight, maxWidth
          )
          top = coordinate.y + prevRowHeight
        }
      })
    }
    return top
  }

            drawStandardTooltipIcons (
    ctx                          ,
    activeIcon                       ,
    icons                    ,
    coordinate            ,
    paneId        ,
    indicatorName        ,
    left        ,
    prevRowHeight        ,
    maxWidth
  )         {
    if (icons.length > 0) {
      let width = 0
      let height = 0
      icons.forEach(icon => {
        const {
          marginLeft = 0, marginTop = 0, marginRight = 0, marginBottom = 0,
          paddingLeft = 0, paddingTop = 0, paddingRight = 0, paddingBottom = 0,
          size, fontFamily, icon: text
        } = icon
        ctx.font = createFont(size, 'normal', fontFamily)
        width += (marginLeft + paddingLeft + ctx.measureText(text).width + paddingRight + marginRight)
        height = Math.max(height, marginTop + paddingTop + size + paddingBottom + marginBottom)
      })
      if (coordinate.x + width > maxWidth) {
        coordinate.x = left
        coordinate.y += prevRowHeight
        prevRowHeight = height
      } else {
        prevRowHeight = Math.max(prevRowHeight, height)
      }
      icons.forEach(icon => {
        const {
          marginLeft = 0, marginTop = 0, marginRight = 0,
          paddingLeft = 0, paddingTop = 0, paddingRight = 0, paddingBottom = 0,
          color, activeColor, size, fontFamily, icon: text,
          backgroundColor, activeBackgroundColor
        } = icon
        const active = activeIcon?.paneId === paneId && activeIcon?.indicatorName === indicatorName && activeIcon?.iconId === icon.id
        this.createFigure({
          name: 'text',
          attrs: { text, x: coordinate.x + marginLeft, y: coordinate.y + marginTop },
          styles: {
            paddingLeft,
            paddingTop,
            paddingRight,
            paddingBottom,
            color: active ? activeColor : color,
            size,
            family: fontFamily,
            backgroundColor: active ? activeBackgroundColor : backgroundColor
          }
        }, {
          mouseClickEvent: this._boundIconClickEvent({ paneId, indicatorName, iconId: icon.id }),
          mouseMoveEvent: this._boundIconMouseMoveEvent({ paneId, indicatorName, iconId: icon.id })
        })?.draw(ctx)
        coordinate.x += (marginLeft + paddingLeft + ctx.measureText(text).width + paddingRight + marginRight)
      })
    }
    return prevRowHeight
  }

            drawStandardTooltipLegends (
    ctx                          ,
    legends                 ,
    coordinate            ,
    left        ,
    prevRowHeight        ,
    maxWidth        ,
    styles
  )         {
    if (legends.length > 0) {
      const { marginLeft, marginTop, marginRight, marginBottom, size, family, weight } = styles
      ctx.font = createFont(size, weight, family)
      legends.forEach(data => {
        const title = data.title
        const value = data.value
        const titleTextWidth = ctx.measureText(title.text).width
        const valueTextWidth = ctx.measureText(value.text).width
        const totalTextWidth = titleTextWidth + valueTextWidth
        const h = marginTop + size + marginBottom
        if (coordinate.x + marginLeft + totalTextWidth + marginRight > maxWidth) {
          coordinate.x = left
          coordinate.y += prevRowHeight
          prevRowHeight = h
        } else {
          prevRowHeight = Math.max(prevRowHeight, h)
        }
        if (title.text.length > 0) {
          this.createFigure({
            name: 'text',
            attrs: { x: coordinate.x + marginLeft, y: coordinate.y + marginTop, text: title.text },
            styles: { color: title.color, size, family, weight }
          })?.draw(ctx)
        }
        this.createFigure({
          name: 'text',
          attrs: { x: coordinate.x + marginLeft + titleTextWidth, y: coordinate.y + marginTop, text: value.text },
          styles: { color: value.color, size, family, weight }
        })?.draw(ctx)
        coordinate.x += (marginLeft + totalTextWidth + marginRight)
      })
    }
    return prevRowHeight
  }

            isDrawTooltip (crosshair           , styles              )          {
    const showRule = styles.showRule
    return showRule === TooltipShowRule.Always ||
      (showRule === TooltipShowRule.FollowCross && isString(crosshair.paneId))
  }

            getIndicatorTooltipData (
    dataList             ,
    crosshair           ,
    indicator           ,
    customApi           ,
    thousandsSeparator        ,
    decimalFoldThreshold        ,
    styles
  )                       {
    const tooltipStyles = styles.tooltip
    const name = tooltipStyles.showName ? indicator.shortName : ''
    let calcParamsText = ''
    const calcParams = indicator.calcParams
    if (calcParams.length > 0 && tooltipStyles.showParams) {
      calcParamsText = `(${calcParams.join(',')})`
    }

    const tooltipData                       = { name, calcParamsText, values: [], icons: tooltipStyles.icons }

    const dataIndex = crosshair.dataIndex
    const result = indicator.result ?? []

    const legends                  = []
    if (indicator.visible) {
      const indicatorData = result[dataIndex] ?? {}
      eachFigures(dataList, indicator, dataIndex, styles, (figure                 , figureStyles                                ) => {
        if (isString(figure.title)) {
          const color = figureStyles.color
          let value = indicatorData[figure.key] ?? tooltipStyles.defaultValue
          if (isNumber(value)) {
            value = formatPrecision(value, indicator.precision)
            if (indicator.shouldFormatBigNumber) {
              value = customApi.formatBigNumber(value          )
            }
            value = formatFoldDecimal(formatThousands(value          , thousandsSeparator), decimalFoldThreshold)
          }
          legends.push({ title: { text: figure.title, color }, value: { text: value, color } })
        }
      })
      tooltipData.values = legends
    }

    if (indicator.createTooltipDataSource !== null) {
      const widget = this.getWidget()
      const pane = widget.getPane()
      const chartStore = pane.getChart().getChartStore()
      const { name: customName, calcParamsText: customCalcParamsText, values: customLegends, icons: customIcons } = indicator.createTooltipDataSource({
        kLineDataList: dataList,
        indicator,
        visibleRange: chartStore.getTimeScaleStore().getVisibleRange(),
        bounding: widget.getBounding(),
        crosshair,
        defaultStyles: styles,
        xAxis: pane.getChart().getXAxisPane().getAxisComponent(),
        yAxis: pane.getAxisComponent()
      })
      if (isString(customName) && tooltipStyles.showName) {
        tooltipData.name = customName
      }
      if (isString(customCalcParamsText) && tooltipStyles.showParams) {
        tooltipData.calcParamsText = customCalcParamsText
      }
      if (isValid(customIcons)) {
        tooltipData.icons = customIcons
      }
      if (isValid(customLegends) && indicator.visible) {
        const optimizedLegends                  = []
        const color = styles.tooltip.text.color
        customLegends.forEach(data => {
          let title = { text: '', color }
          if (isObject(data.title)) {
            title = data.title
          } else {
            title.text = data.title
          }
          let value = { text: '', color }
          if (isObject(data.value)) {
            value = data.value
          } else {
            value.text = data.value ?? tooltipStyles.defaultValue
          }
          if (isNumber(value.text)) {
            let text = formatPrecision(value.text, indicator.precision)
            if (indicator.shouldFormatBigNumber) {
              text = customApi.formatBigNumber(text)
            }
            text = formatFoldDecimal(formatThousands(text, thousandsSeparator), decimalFoldThreshold)
            value.text = text
          }
          optimizedLegends.push({ title, value })
        })
        tooltipData.values = optimizedLegends
      }
    }
    return tooltipData
  }

            classifyTooltipIcons (icons                    )                       {
    const leftIcons                     = []
    const middleIcons                     = []
    const rightIcons                     = []
    icons.forEach(icon => {
      switch (icon.position) {
        case TooltipIconPosition.Left: {
          leftIcons.push(icon)
          break
        }
        case TooltipIconPosition.Middle: {
          middleIcons.push(icon)
          break
        }
        case TooltipIconPosition.Right: {
          rightIcons.push(icon)
          break
        }
      }
    })
    return [leftIcons, middleIcons, rightIcons]
  }
}


},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => IndicatorView });
const $mod0 = $load(23);
const CandleType = $mod0.CandleType;
const $mod2 = $load(81);
const formatValue = $mod2.formatValue;
const $mod4 = $load(87);
const isNumber = $mod4.isNumber;
const isValid = $mod4.isValid;
const $mod7 = $load(31);
const eachFigures = $mod7.eachFigures;
const $mod9 = $load(50);
const CandleBarView = $mod9.default;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */















class IndicatorView extends CandleBarView {
           getCandleBarOptions (chartStore            )                             {
    const pane = this.getWidget().getPane()
    const yAxis = pane.getAxisComponent()
    if (!yAxis.isInCandle()) {
      const indicators = chartStore.getIndicatorStore().getInstances(pane.getId())
      for (const indicator of indicators) {
        if (indicator.shouldOhlc && indicator.visible) {
          const indicatorStyles = indicator.styles
          const defaultStyles = chartStore.getStyles().indicator
          const upColor = formatValue(indicatorStyles, 'ohlc.upColor', defaultStyles.ohlc.upColor)
          const downColor = formatValue(indicatorStyles, 'ohlc.downColor', defaultStyles.ohlc.downColor)
          const noChangeColor = formatValue(indicatorStyles, 'ohlc.noChangeColor', defaultStyles.ohlc.noChangeColor)
          return {
            type: CandleType.Ohlc,
            styles: {
              upColor,
              downColor,
              noChangeColor,
              upBorderColor: upColor,
              downBorderColor: downColor,
              noChangeBorderColor: noChangeColor,
              upWickColor: upColor,
              downWickColor: downColor,
              noChangeWickColor: noChangeColor
            }
          }
        }
      }
    }
    return null
  }

           drawImp (ctx                          )       {
    super.drawImp(ctx)
    const widget = this.getWidget()
    const pane = widget.getPane()
    const chart = pane.getChart()
    const bounding = widget.getBounding()
    const xAxis = chart.getXAxisPane().getAxisComponent()
    const yAxis = pane.getAxisComponent()
    const chartStore = chart.getChartStore()
    const dataList = chartStore.getDataList()
    const timeScaleStore = chartStore.getTimeScaleStore()
    const visibleRange = timeScaleStore.getVisibleRange()
    const indicators = chartStore.getIndicatorStore().getInstances(pane.getId())
    const defaultStyles = chartStore.getStyles().indicator
    ctx.save()
    indicators.forEach(indicator => {
      if (indicator.visible) {
        if (indicator.zLevel < 0) {
          ctx.globalCompositeOperation = 'destination-over'
        } else {
          ctx.globalCompositeOperation = 'source-over'
        }
        let isCover = false
        if (indicator.draw !== null) {
          ctx.save()
          isCover = indicator.draw({
            ctx,
            kLineDataList: dataList,
            indicator,
            visibleRange,
            bounding,
            barSpace: timeScaleStore.getBarSpace(),
            defaultStyles,
            xAxis,
            yAxis
          }) ?? false
          ctx.restore()
        }
        if (!isCover) {
          const result = indicator.result
          const lines                                                                       = []

          this.eachChildren((data             , barSpace          ) => {
            const { halfGapBar } = barSpace
            const { dataIndex, x } = data
            const prevX = xAxis.convertToPixel(dataIndex - 1)
            const nextX = xAxis.convertToPixel(dataIndex + 1)
            const prevData = result[dataIndex - 1] ?? null
            const currentData = result[dataIndex] ?? null
            const nextData = result[dataIndex + 1] ?? null
            const prevCoordinate = { x: prevX }
            const currentCoordinate = { x }
            const nextCoordinate = { x: nextX }
            indicator.figures.forEach(({ key }) => {
              const prevValue = prevData?.[key]
              if (isNumber(prevValue)) {
                prevCoordinate[key] = yAxis.convertToPixel(prevValue)
              }
              const currentValue = currentData?.[key]
              if (isNumber(currentValue)) {
                currentCoordinate[key] = yAxis.convertToPixel(currentValue)
              }
              const nextValue = nextData?.[key]
              if (isNumber(nextValue)) {
                nextCoordinate[key] = yAxis.convertToPixel(nextValue)
              }
            })
            eachFigures(dataList, indicator, dataIndex, defaultStyles, (figure                 , figureStyles                      , figureIndex        ) => {
              if (isValid(currentData?.[figure.key])) {
                const valueY = currentCoordinate[figure.key]
                let attrs = figure.attrs?.({
                  data: { prev: prevData, current: currentData, next: nextData },
                  coordinate: { prev: prevCoordinate, current: currentCoordinate, next: nextCoordinate },
                  bounding,
                  barSpace,
                  xAxis,
                  yAxis
                })
                if (!isValid                      (attrs)) {
                  switch (figure.type) {
                    case 'circle': {
                      attrs = { x, y: valueY, r: Math.max(1, halfGapBar) }
                      break
                    }
                    case 'rect':
                    case 'bar': {
                      const baseValue = figure.baseValue ?? yAxis.getRange().from
                      const baseValueY = yAxis.convertToPixel(baseValue)
                      let height = Math.abs(baseValueY - (valueY          ))
                      if (baseValue !== currentData?.[figure.key]) {
                        height = Math.max(1, height)
                      }
                      let y
                      if (valueY > baseValueY) {
                        y = baseValueY
                      } else {
                        y = valueY
                      }
                      attrs = {
                        x: x - halfGapBar,
                        y,
                        width: Math.max(1, halfGapBar * 2),
                        height
                      }
                      break
                    }
                    case 'line': {
                      if (!isValid(lines[figureIndex])) {
                        lines[figureIndex] = []
                      }
                      if (isNumber(currentCoordinate[figure.key]) && isNumber(nextCoordinate[figure.key])) {
                        lines[figureIndex].push({
                          coordinates: [
                            { x: currentCoordinate.x, y: currentCoordinate[figure.key] },
                            { x: nextCoordinate.x, y: nextCoordinate[figure.key] }
                          ],
                          styles: figureStyles
                        })
                      }
                      break
                    }
                    default: { break }
                  }
                }
                const type = figure.type
                if (isValid                      (attrs) && type !== 'line') {
                  this.createFigure({
                    name: type === 'bar' ? 'rect' : type,
                    attrs,
                    styles: figureStyles
                  })?.draw(ctx)
                }
              }
            })
          })

          // merge line and render
          lines.forEach(items => {
            if (items.length > 1) {
              const mergeLines = [
                {
                  coordinates: [items[0].coordinates[0], items[0].coordinates[1]],
                  styles: items[0].styles
                }
              ]
              for (let i = 1; i < items.length; i++) {
                const lastMergeLine = mergeLines[mergeLines.length - 1]
                const current = items[i]
                const lastMergeLineLastCoordinate = lastMergeLine.coordinates[lastMergeLine.coordinates.length - 1]
                if (
                  lastMergeLineLastCoordinate.x === current.coordinates[0].x &&
                  lastMergeLineLastCoordinate.y === current.coordinates[0].y &&
                  lastMergeLine.styles.style === current.styles.style &&
                  lastMergeLine.styles.color === current.styles.color &&
                  lastMergeLine.styles.size === current.styles.size &&
                  lastMergeLine.styles.smooth === current.styles.smooth &&
                  lastMergeLine.styles.dashedValue[0] === current.styles.dashedValue[0] &&
                  lastMergeLine.styles.dashedValue[1] === current.styles.dashedValue[1]
                ) {
                  lastMergeLine.coordinates.push(current.coordinates[1])
                } else {
                  mergeLines.push({
                    coordinates: [current.coordinates[0], current.coordinates[1]],
                    styles: current.styles
                  })
                }
              }
              mergeLines.forEach(({ coordinates, styles }) => {
                this.createFigure({
                  name: 'line',
                  attrs: { coordinates },
                  styles
                })?.draw(ctx)
              })
            }
          })
        }
      }
    })
    ctx.restore()
  }
}


},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => OverlayView });
const $mod0 = $load(87);
const isBoolean = $mod0.isBoolean;
const isNumber = $mod0.isNumber;
const isValid = $mod0.isValid;
const $mod4 = $load(32);
const OVERLAY_FIGURE_KEY_PREFIX = $mod4.OVERLAY_FIGURE_KEY_PREFIX;
const OverlayMode = $mod4.OverlayMode;
const getAllOverlayFigureIgnoreEventTypes = $mod4.getAllOverlayFigureIgnoreEventTypes;
const $mod8 = $load(45);
const EventOverlayInfoFigureType = $mod8.EventOverlayInfoFigureType;
const $mod10 = $load(40);
const PaneIdConstants = $mod10.PaneIdConstants;
const $mod12 = $load(66);
const View = $mod12.default;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */































class OverlayView                         extends View    {
  constructor (widget                         ) {
    super(widget)
    this._initEvent()
  }

          _initEvent ()       {
    const pane = this.getWidget().getPane()
    const paneId = pane.getId()
    const overlayStore = pane.getChart().getChartStore().getOverlayStore()
    this.registerEvent('mouseMoveEvent', (event                 ) => {
      const progressInstanceInfo = overlayStore.getProgressInstanceInfo()
      if (progressInstanceInfo !== null) {
        const overlay = progressInstanceInfo.instance
        let progressInstancePaneId = progressInstanceInfo.paneId
        if (overlay.isStart()) {
          overlayStore.updateProgressInstanceInfo(paneId)
          progressInstancePaneId = paneId
        }
        const index = overlay.points.length - 1
        const key = `${OVERLAY_FIGURE_KEY_PREFIX}point_${index}`
        if (overlay.isDrawing() && progressInstancePaneId === paneId) {
          overlay.eventMoveForDrawing(this._coordinateToPoint(progressInstanceInfo.instance, event))
          overlay.onDrawing?.({ overlay, figureKey: key, figureIndex: index, ...event })
        }
        return this._figureMouseMoveEvent(
          overlay,
          EventOverlayInfoFigureType.Point,
          key,
          index,
          0
        )(event)
      }
      overlayStore.setHoverInstanceInfo({
        paneId, instance: null, figureType: EventOverlayInfoFigureType.None, figureKey: '', figureIndex: -1, attrsIndex: -1
      }, event)
      return false
    }).registerEvent('mouseClickEvent', (event                 ) => {
      const progressInstanceInfo = overlayStore.getProgressInstanceInfo()
      if (progressInstanceInfo !== null) {
        const overlay = progressInstanceInfo.instance
        let progressInstancePaneId = progressInstanceInfo.paneId
        if (overlay.isStart()) {
          overlayStore.updateProgressInstanceInfo(paneId, true)
          progressInstancePaneId = paneId
        }
        const index = overlay.points.length - 1
        const key = `${OVERLAY_FIGURE_KEY_PREFIX}point_${index}`
        if (overlay.isDrawing() && progressInstancePaneId === paneId) {
          overlay.eventMoveForDrawing(this._coordinateToPoint(overlay, event))
          overlay.onDrawing?.({ overlay, figureKey: key, figureIndex: index, ...event })
          overlay.nextStep()
          if (!overlay.isDrawing()) {
            overlayStore.progressInstanceComplete()
            overlay.onDrawEnd?.({ overlay, figureKey: key, figureIndex: index, ...event })
          }
        }
        return this._figureMouseClickEvent(
          overlay,
          EventOverlayInfoFigureType.Point,
          key,
          index,
          0
        )(event)
      }
      overlayStore.setClickInstanceInfo({
        paneId, instance: null, figureType: EventOverlayInfoFigureType.None, figureKey: '', figureIndex: -1, attrsIndex: -1
      }, event)
      return false
    }).registerEvent('mouseDoubleClickEvent', (event                 ) => {
      const progressInstanceInfo = overlayStore.getProgressInstanceInfo()
      if (progressInstanceInfo !== null) {
        const overlay = progressInstanceInfo.instance
        const progressInstancePaneId = progressInstanceInfo.paneId
        if (overlay.isDrawing() && progressInstancePaneId === paneId) {
          overlay.forceComplete()
          if (!overlay.isDrawing()) {
            overlayStore.progressInstanceComplete()
            const index = overlay.points.length - 1
            const key = `${OVERLAY_FIGURE_KEY_PREFIX}point_${index}`
            overlay.onDrawEnd?.({ overlay, figureKey: key, figureIndex: index, ...event })
          }
        }
        const index = overlay.points.length - 1
        return this._figureMouseClickEvent(
          overlay,
          EventOverlayInfoFigureType.Point,
          `${OVERLAY_FIGURE_KEY_PREFIX}point_${index}`,
          index,
          0
        )(event)
      }
      return false
    }).registerEvent('mouseRightClickEvent', (event                 ) => {
      const progressInstanceInfo = overlayStore.getProgressInstanceInfo()
      if (progressInstanceInfo !== null) {
        const overlay = progressInstanceInfo.instance
        if (overlay.isDrawing()) {
          const index = overlay.points.length - 1
          return this._figureMouseRightClickEvent(
            overlay,
            EventOverlayInfoFigureType.Point,
            `${OVERLAY_FIGURE_KEY_PREFIX}point_${index}`,
            index,
            0
          )(event)
        }
      }
      return false
    }).registerEvent('mouseUpEvent', (event                 ) => {
      const { instance, figureIndex, figureKey } = overlayStore.getPressedInstanceInfo()
      if (instance !== null) {
        instance.onPressedMoveEnd?.({ overlay: instance, figureKey, figureIndex, ...event })
      }
      overlayStore.setPressedInstanceInfo({
        paneId, instance: null, figureType: EventOverlayInfoFigureType.None, figureKey: '', figureIndex: -1, attrsIndex: -1
      })
      return false
    }).registerEvent('pressedMouseMoveEvent', (event                 ) => {
      const { instance, figureType, figureIndex, figureKey } = overlayStore.getPressedInstanceInfo()
      if (instance !== null) {
        if (!instance.lock) {
          if (!(instance.onPressedMoving?.({ overlay: instance, figureIndex, figureKey, ...event }) ?? false)) {
            const point = this._coordinateToPoint(instance, event)
            if (figureType === EventOverlayInfoFigureType.Point) {
              instance.eventPressedPointMove(point, figureIndex)
            } else {
              instance.eventPressedOtherMove(point, this.getWidget().getPane().getChart().getChartStore().getTimeScaleStore())
            }
          }
        }
        return true
      }
      return false
    })
  }

          _createFigureEvents (
    overlay         ,
    figureType                            ,
    figureKey        ,
    figureIndex        ,
    attrsIndex        ,
    ignoreEvent
  )                           {
    let eventHandler
    if (!overlay.isDrawing()) {
      let eventTypes                                 = []
      if (isValid(ignoreEvent)) {
        if (isBoolean(ignoreEvent)) {
          if (ignoreEvent) {
            eventTypes = getAllOverlayFigureIgnoreEventTypes()
          }
        } else {
          eventTypes = ignoreEvent
        }
      }
      if (eventTypes.length === 0) {
        return {
          mouseMoveEvent: this._figureMouseMoveEvent(overlay, figureType, figureKey, figureIndex, attrsIndex),
          mouseDownEvent: this._figureMouseDownEvent(overlay, figureType, figureKey, figureIndex, attrsIndex),
          mouseClickEvent: this._figureMouseClickEvent(overlay, figureType, figureKey, figureIndex, attrsIndex),
          mouseRightClickEvent: this._figureMouseRightClickEvent(overlay, figureType, figureKey, figureIndex, attrsIndex),
          mouseDoubleClickEvent: this._figureMouseDoubleClickEvent(overlay, figureType, figureKey, figureIndex, attrsIndex)
        }
      }
      eventHandler = {}
      // [
      //   'mouseClickEvent', mouseDoubleClickEvent, 'mouseRightClickEvent',
      //   'tapEvent', 'doubleTapEvent', 'mouseDownEvent',
      //   'touchStartEvent', 'mouseMoveEvent', 'touchMoveEvent'
      // ]
      if (!eventTypes.includes('mouseMoveEvent') && !eventTypes.includes('touchMoveEvent')) {
        eventHandler.mouseMoveEvent = this._figureMouseMoveEvent(overlay, figureType, figureKey, figureIndex, attrsIndex)
      }
      if (!eventTypes.includes('mouseDownEvent') && !eventTypes.includes('touchStartEvent')) {
        eventHandler.mouseDownEvent = this._figureMouseDownEvent(overlay, figureType, figureKey, figureIndex, attrsIndex)
      }
      if (!eventTypes.includes('mouseClickEvent') && !eventTypes.includes('tapEvent')) {
        eventHandler.mouseClickEvent = this._figureMouseClickEvent(overlay, figureType, figureKey, figureIndex, attrsIndex)
      }
      if (!eventTypes.includes('mouseDoubleClickEvent') && !eventTypes.includes('doubleTapEvent')) {
        eventHandler.mouseDoubleClickEvent = this._figureMouseDoubleClickEvent(overlay, figureType, figureKey, figureIndex, attrsIndex)
      }
      if (!eventTypes.includes('mouseRightClickEvent')) {
        eventHandler.mouseRightClickEvent = this._figureMouseRightClickEvent(overlay, figureType, figureKey, figureIndex, attrsIndex)
      }
    }
    return eventHandler
  }

          _figureMouseMoveEvent (overlay         , figureType                            , figureKey        , figureIndex        , attrsIndex        )                          {
    return (event                 ) => {
      const pane = this.getWidget().getPane()
      const overlayStore = pane.getChart().getChartStore().getOverlayStore()
      overlayStore.setHoverInstanceInfo(
        { paneId: pane.getId(), instance: overlay, figureType, figureKey, figureIndex, attrsIndex }, event
      )
      return true
    }
  }

          _figureMouseDownEvent (overlay         , figureType                            , figureKey        , figureIndex        , attrsIndex        )                          {
    return (event                 ) => {
      const pane = this.getWidget().getPane()
      const paneId = pane.getId()
      const overlayStore = pane.getChart().getChartStore().getOverlayStore()
      overlay.startPressedMove(this._coordinateToPoint(overlay, event))
      overlay.onPressedMoveStart?.({ overlay, figureIndex, figureKey, ...event })
      overlayStore.setPressedInstanceInfo({ paneId, instance: overlay, figureType, figureKey, figureIndex, attrsIndex })
      return true
    }
  }

          _figureMouseClickEvent (overlay         , figureType                            , figureKey        , figureIndex        , attrsIndex        )                          {
    return (event                 ) => {
      const pane = this.getWidget().getPane()
      const paneId = pane.getId()
      const overlayStore = pane.getChart().getChartStore().getOverlayStore()
      overlayStore.setClickInstanceInfo({ paneId, instance: overlay, figureType, figureKey, figureIndex, attrsIndex }, event)
      return true
    }
  }

          _figureMouseDoubleClickEvent (overlay         , _figureType                            , figureKey        , figureIndex        , _attrsIndex        )                          {
    return (event                 ) => {
      overlay.onDoubleClick?.({ ...event, figureIndex, figureKey, overlay })
      return true
    }
  }

          _figureMouseRightClickEvent (overlay         , _figureType                            , figureKey        , figureIndex        , _attrsIndex        )                          {
    return (event                 ) => {
      if (!(overlay.onRightClick?.({ overlay, figureIndex, figureKey, ...event }) ?? false)) {
        const pane = this.getWidget().getPane()
        const overlayStore = pane.getChart().getChartStore().getOverlayStore()
        overlayStore.removeInstance(overlay)
      }
      return true
    }
  }

          _coordinateToPoint (overlay         , coordinate            )                 {
    const point                 = {}
    const pane = this.getWidget().getPane()
    const chart = pane.getChart()
    const paneId = pane.getId()
    const timeScaleStore = chart.getChartStore().getTimeScaleStore()
    if (this.coordinateToPointTimestampDataIndexFlag()) {
      const xAxis = chart.getXAxisPane().getAxisComponent()
      const dataIndex = xAxis.convertFromPixel(coordinate.x)
      const timestamp = timeScaleStore.dataIndexToTimestamp(dataIndex) ?? undefined
      point.dataIndex = dataIndex
      point.timestamp = timestamp
    }
    if (this.coordinateToPointValueFlag()) {
      const yAxis = pane.getAxisComponent()
      let value = yAxis.convertFromPixel(coordinate.y)
      if (overlay.mode !== OverlayMode.Normal && paneId === PaneIdConstants.CANDLE && isNumber(point.dataIndex)) {
        const kLineData = timeScaleStore.getDataByDataIndex(point.dataIndex)
        if (kLineData !== null) {
          const modeSensitivity = overlay.modeSensitivity
          if (value > kLineData.high) {
            if (overlay.mode === OverlayMode.WeakMagnet) {
              const highY = yAxis.convertToPixel(kLineData.high)
              const buffValue = yAxis.convertFromPixel(highY - modeSensitivity)
              if (value < buffValue) {
                value = kLineData.high
              }
            } else {
              value = kLineData.high
            }
          } else if (value < kLineData.low) {
            if (overlay.mode === OverlayMode.WeakMagnet) {
              const lowY = yAxis.convertToPixel(kLineData.low)
              const buffValue = yAxis.convertFromPixel(lowY - modeSensitivity)
              if (value > buffValue) {
                value = kLineData.low
              }
            } else {
              value = kLineData.low
            }
          } else {
            const max = Math.max(kLineData.open, kLineData.close)
            const min = Math.min(kLineData.open, kLineData.close)
            if (value > max) {
              if (value - max < kLineData.high - value) {
                value = max
              } else {
                value = kLineData.high
              }
            } else if (value < min) {
              if (value - kLineData.low < min - value) {
                value = kLineData.low
              } else {
                value = min
              }
            } else if (max - value < value - min) {
              value = max
            } else {
              value = min
            }
          }
        }
      }
      point.value = value
    }
    return point
  }

            coordinateToPointValueFlag ()          {
    return true
  }

            coordinateToPointTimestampDataIndexFlag ()          {
    return true
  }

           dispatchEvent (name           , event                 , other         )          {
    if (this.getWidget().getPane().getChart().getChartStore().getOverlayStore().isDrawing()) {
      return this.onEvent(name, event, other)
    }
    return super.dispatchEvent(name, event, other)
  }

           checkEventOn ()          {
    return true
  }

           drawImp (ctx                          )       {
    const widget = this.getWidget()
    const pane = widget.getPane()
    const paneId = pane.getId()
    const chart = pane.getChart()
    const yAxis = pane.getAxisComponent()
    const xAxis = chart.getXAxisPane().getAxisComponent()
    const bounding = widget.getBounding()
    const chartStore = chart.getChartStore()
    const customApi = chartStore.getCustomApi()
    const thousandsSeparator = chartStore.getThousandsSeparator()
    const decimalFoldThreshold = chartStore.getDecimalFoldThreshold()
    const timeScaleStore = chartStore.getTimeScaleStore()
    const dateTimeFormat = timeScaleStore.getDateTimeFormat()
    const barSpace = timeScaleStore.getBarSpace()
    const precision = chartStore.getPrecision()
    const defaultStyles = chartStore.getStyles().overlay
    const overlayStore = chartStore.getOverlayStore()
    const hoverInstanceInfo = overlayStore.getHoverInstanceInfo()
    const clickInstanceInfo = overlayStore.getClickInstanceInfo()
    const overlays = this.getCompleteOverlays(overlayStore, paneId)
    const paneIndicators = chartStore.getIndicatorStore().getInstances(paneId)
    const overlayPrecision = paneIndicators.reduce((prev, indicator) => {
      const precision = indicator.precision
      prev[indicator.name] = precision
      prev.max = Math.max(prev.max, precision)
      prev.min = Math.min(prev.min, precision)
      prev.excludePriceVolumeMax = Math.max(prev.excludePriceVolumeMax, precision)
      prev.excludePriceVolumeMin = Math.min(prev.excludePriceVolumeMin, precision)
      return prev
    }, {
      ...precision,
      max: Math.max(precision.price, precision.volume),
      min: Math.min(precision.price, precision.volume),
      excludePriceVolumeMax: Number.MIN_SAFE_INTEGER,
      excludePriceVolumeMin: Number.MAX_SAFE_INTEGER
    })
    overlays.forEach(overlay => {
      if (overlay.visible) {
        this._drawOverlay(
          ctx, overlay, bounding, barSpace, overlayPrecision,
          dateTimeFormat, customApi, thousandsSeparator, decimalFoldThreshold,
          defaultStyles, xAxis, yAxis,
          hoverInstanceInfo, clickInstanceInfo, timeScaleStore
        )
      }
    })
    const progressInstanceInfo = overlayStore.getProgressInstanceInfo()
    if (progressInstanceInfo !== null) {
      const overlay = this.getProgressOverlay(progressInstanceInfo, paneId)
      // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
      if (overlay !== null && overlay.visible) {
        this._drawOverlay(
          ctx, overlay, bounding, barSpace,
          overlayPrecision, dateTimeFormat, customApi, thousandsSeparator, decimalFoldThreshold,
          defaultStyles, xAxis, yAxis,
          hoverInstanceInfo, clickInstanceInfo, timeScaleStore
        )
      }
    }
  }

          _drawOverlay (
    ctx                          ,
    overlay         ,
    bounding          ,
    barSpace          ,
    precision                  ,
    dateTimeFormat                     ,
    customApi           ,
    thousandsSeparator        ,
    decimalFoldThreshold        ,
    defaultStyles              ,
    xAxis                 ,
    yAxis                 ,
    hoverInstanceInfo                  ,
    clickInstanceInfo                  ,
    timeScaleStore
  )       {
    const { points } = overlay
    const coordinates = points.map(point => {
      let dataIndex = point.dataIndex
      if (isNumber(point.timestamp)) {
        dataIndex = timeScaleStore.timestampToDataIndex(point.timestamp)
      }
      const coordinate = { x: 0, y: 0 }
      if (isNumber(dataIndex)) {
        coordinate.x = xAxis?.convertToPixel(dataIndex) ?? 0
      }
      if (isNumber(point.value)) {
        coordinate.y = yAxis?.convertToPixel(point.value) ?? 0
      }
      return coordinate
    })
    if (coordinates.length > 0) {
      const figures = new Array               ().concat(
        this.getFigures(
          overlay, coordinates, bounding, barSpace, precision, thousandsSeparator, decimalFoldThreshold, dateTimeFormat, defaultStyles, xAxis, yAxis
        )
      )
      this.drawFigures(
        ctx,
        overlay,
        figures,
        defaultStyles
      )
    }
    this.drawDefaultFigures(
      ctx,
      overlay,
      coordinates,
      bounding,
      precision,
      dateTimeFormat,
      customApi,
      thousandsSeparator,
      decimalFoldThreshold,
      defaultStyles,
      xAxis,
      yAxis,
      hoverInstanceInfo,
      clickInstanceInfo
    )
  }

            drawFigures (ctx                          , overlay         , figures                 , defaultStyles              )       {
    figures.forEach((figure, figureIndex) => {
      const { type, styles, attrs, ignoreEvent } = figure
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const attrsArray = [].concat(attrs)
      attrsArray.forEach((ats, attrsIndex) => {
        const events = this._createFigureEvents(overlay, EventOverlayInfoFigureType.Other, figure.key ?? '', figureIndex, attrsIndex, ignoreEvent)
        const ss = { ...defaultStyles[type], ...overlay.styles?.[type], ...styles }
        this.createFigure({
          name: type, attrs: ats, styles: ss
        }, events)?.draw(ctx)
      })
    })
  }

            getCompleteOverlays (overlayStore              , paneId        )            {
    return overlayStore.getInstances(paneId)
  }

            getProgressOverlay (info                     , paneId        )                    {
    if (info.paneId === paneId) {
      return info.instance
    }
    return null
  }

            getFigures (
    overlay         ,
    coordinates              ,
    bounding          ,
    barSpace          ,
    precision                  ,
    thousandsSeparator        ,
    decimalFoldThreshold        ,
    dateTimeFormat                     ,
    defaultStyles              ,
    xAxis                 ,
    yAxis
  )                                  {
    return overlay.createPointFigures?.({ overlay, coordinates, bounding, barSpace, precision, thousandsSeparator, decimalFoldThreshold, dateTimeFormat, defaultStyles, xAxis, yAxis }) ?? []
  }

            drawDefaultFigures (
    ctx                          ,
    overlay         ,
    coordinates              ,
    _bounding          ,
    _precision                  ,
    _dateTimeFormat                     ,
    _customApi           ,
    _thousandsSeparator        ,
    _drawDefaultFigures        ,
    defaultStyles              ,
    _xAxis                 ,
    _yAxis                 ,
    hoverInstanceInfo                  ,
    clickInstanceInfo
  )       {
    if (overlay.needDefaultPointFigure) {
      if (
        (hoverInstanceInfo.instance?.id === overlay.id && hoverInstanceInfo.figureType !== EventOverlayInfoFigureType.None) ||
        (clickInstanceInfo.instance?.id === overlay.id && clickInstanceInfo.figureType !== EventOverlayInfoFigureType.None)
      ) {
        const styles = overlay.styles
        const pointStyles = { ...defaultStyles.point, ...styles?.point }
        coordinates.forEach(({ x, y }, index) => {
          let radius = pointStyles.radius
          let color = pointStyles.color
          let borderColor = pointStyles.borderColor
          let borderSize = pointStyles.borderSize
          if (
            hoverInstanceInfo.instance?.id === overlay.id &&
            hoverInstanceInfo.figureType === EventOverlayInfoFigureType.Point &&
            hoverInstanceInfo.figureIndex === index
          ) {
            radius = pointStyles.activeRadius
            color = pointStyles.activeColor
            borderColor = pointStyles.activeBorderColor
            borderSize = pointStyles.activeBorderSize
          }
          this.createFigure({
            name: 'circle',
            attrs: { x, y, r: radius + borderSize },
            styles: { color: borderColor }
          }, this._createFigureEvents(overlay, EventOverlayInfoFigureType.Point, `${OVERLAY_FIGURE_KEY_PREFIX}point_${index}`, index, 0))?.draw(ctx)
          this.createFigure({
            name: 'circle',
            attrs: { x, y, r: radius },
            styles: { color }
          })?.draw(ctx)
        })
      }
    }
  }
}


},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => OverlayXAxisView });
const $mod0 = $load(87);
const isNumber = $mod0.isNumber;
const $mod2 = $load(3);
const FormatDateType = $mod2.FormatDateType;
const $mod4 = $load(65);
const OverlayYAxisView = $mod4.default;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */





















class OverlayXAxisView extends OverlayYAxisView        {
           coordinateToPointTimestampDataIndexFlag ()          {
    return true
  }

           coordinateToPointValueFlag ()          {
    return false
  }

           getCompleteOverlays (overlayStore              )            {
    return overlayStore.getInstances()
  }

           getProgressOverlay (info                     )          {
    return info.instance
  }

           getDefaultFigures (
    overlay         ,
    coordinates              ,
    bounding          ,
    _precision           ,
    dateTimeFormat                     ,
    customApi           ,
    _thousandsSeparator        ,
    _decimalFoldThreshold        ,
    _xAxis                 ,
    _yAxis                 ,
    clickInstanceInfo
  )                  {
    const figures                  = []
    if (overlay.needDefaultXAxisFigure && overlay.id === clickInstanceInfo.instance?.id) {
      let leftX = Number.MAX_SAFE_INTEGER
      let rightX = Number.MIN_SAFE_INTEGER
      coordinates.forEach((coordinate, index) => {
        leftX = Math.min(leftX, coordinate.x)
        rightX = Math.max(rightX, coordinate.x)
        const point = overlay.points[index]
        if (isNumber(point.timestamp)) {
          const text = customApi.formatDate(dateTimeFormat, point.timestamp, 'YYYY-MM-DD HH:mm', FormatDateType.Crosshair)
          figures.push({ type: 'text', attrs: { x: coordinate.x, y: 0, text, align: 'center' }, ignoreEvent: true })
        }
      })
      if (coordinates.length > 1) {
        figures.unshift({ type: 'rect', attrs: { x: leftX, y: 0, width: rightX - leftX, height: bounding.height }, ignoreEvent: true })
      }
    }
    return figures
  }

           getFigures (
    overlay         ,
    coordinates              ,
    bounding          ,
    barSpace          ,
    precision                  ,
    thousandsSeparator        ,
    decimalFoldThreshold        ,
    dateTimeFormat                     ,
    defaultStyles              ,
    xAxis                 ,
    yAxis
  )                                  {
    return overlay.createXAxisFigures?.({ overlay, coordinates, bounding, barSpace, precision, thousandsSeparator, decimalFoldThreshold, dateTimeFormat, defaultStyles, xAxis, yAxis }) ?? []
  }
}


},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => OverlayYAxisView });
const $mod0 = $load(81);
const formatPrecision = $mod0.formatPrecision;
const formatThousands = $mod0.formatThousands;
const formatFoldDecimal = $mod0.formatFoldDecimal;
const $mod4 = $load(87);
const isNumber = $mod4.isNumber;
const $mod6 = $load(63);
const OverlayView = $mod6.default;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */




















class OverlayYAxisView                         extends OverlayView    {
           coordinateToPointTimestampDataIndexFlag ()          {
    return false
  }

           drawDefaultFigures (
    ctx                          ,
    overlay         ,
    coordinates              ,
    bounding          ,
    precision                  ,
    dateTimeFormat                     ,
    customApi           ,
    thousandsSeparator        ,
    decimalFoldThreshold        ,
    defaultStyles              ,
    xAxis                 ,
    yAxis                 ,
    _hoverInstanceInfo                  ,
    clickInstanceInfo
  )       {
    this.drawFigures(
      ctx,
      overlay,
      this.getDefaultFigures(overlay, coordinates, bounding, precision, dateTimeFormat, customApi, thousandsSeparator, decimalFoldThreshold, xAxis, yAxis, clickInstanceInfo),
      defaultStyles
    )
  }

            getDefaultFigures (
    overlay         ,
    coordinates              ,
    bounding          ,
    precision                  ,
    _dateTimeFormat                     ,
    _customApi           ,
    thousandsSeparator        ,
    decimalFoldThreshold        ,
    _xAxis                 ,
    yAxis                 ,
    clickInstanceInfo
  )                  {
    const figures                  = []
    if (
      overlay.needDefaultYAxisFigure &&
      overlay.id === clickInstanceInfo.instance?.id &&
      clickInstanceInfo.paneId === this.getWidget().getPane().getId()
    ) {
      let topY = Number.MAX_SAFE_INTEGER
      let bottomY = Number.MIN_SAFE_INTEGER
      const isFromZero = yAxis?.isFromZero() ?? false
      let textAlign
      let x
      if (isFromZero) {
        textAlign = 'left'
        x = 0
      } else {
        textAlign = 'right'
        x = bounding.width
      }
      coordinates.forEach((coordinate, index) => {
        const point = overlay.points[index]
        if (isNumber(point.value)) {
          topY = Math.min(topY, coordinate.y)
          bottomY = Math.max(bottomY, coordinate.y)
          const text = formatFoldDecimal(formatThousands(formatPrecision(point.value, precision.price), thousandsSeparator), decimalFoldThreshold)
          figures.push({ type: 'text', attrs: { x, y: coordinate.y, text, align: textAlign, baseline: 'middle' }, ignoreEvent: true })
        }
      })
      if (coordinates.length > 1) {
        figures.unshift({ type: 'rect', attrs: { x: 0, y: topY, width: bounding.width, height: bottomY - topY }, ignoreEvent: true })
      }
    }
    return figures
  }

           getFigures (
    overlay         ,
    coordinates              ,
    bounding          ,
    barSpace          ,
    precision                  ,
    thousandsSeparator        ,
    decimalFoldThreshold        ,
    dateTimeFormat                     ,
    defaultStyles              ,
    xAxis                 ,
    yAxis
  )                                  {
    return overlay.createYAxisFigures?.({ overlay, coordinates, bounding, barSpace, precision, thousandsSeparator, decimalFoldThreshold, dateTimeFormat, defaultStyles, xAxis, yAxis }) ?? []
  }
}


},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => View });
const $mod0 = $load(13);
const Eventful = $mod0.default;
const $mod2 = $load(87);
const isValid = $mod2.isValid;
const $mod4 = $load(90);
const getInnerFigureClass = $mod4.getInnerFigureClass;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */















class View                        extends Eventful {
  /**
   * Parent widget
   */
                   _widget

  constructor (widget                         ) {
    super()
    this._widget = widget
  }

  getWidget ()                          { return this._widget }

            createFigure (figure              , eventHandler               )                   {
    const FigureClazz = getInnerFigureClass(figure.name)
    if (FigureClazz !== null) {
      const instance = new FigureClazz(figure)
      if (isValid(eventHandler)) {
        for (const key in eventHandler) {
          // eslint-disable-next-line no-prototype-builtins
          if (eventHandler.hasOwnProperty(key)) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            instance.registerEvent(key             , eventHandler[key])
          }
        }
        this.addChild(instance)
      }
      return instance
    }
    return null
  }

  draw (ctx                          )       {
    this.clear()
    this.drawImp(ctx)
  }


}


},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => XAxisView });
const $mod0 = $load(48);
const AxisView = $mod0.default;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */












class XAxisView extends AxisView        {
           getAxisStyles (styles        )            {
    return styles.xAxis
  }

           createAxisLine (bounding          )            {
    return {
      coordinates: [
        { x: 0, y: 0 },
        { x: bounding.width, y: 0 }
      ]
    }
  }

           createTickLines (ticks            , _bounding          , styles           )              {
    const tickLineStyles = styles.tickLine
    const axisLineSize = styles.axisLine.size
    return ticks.map(tick => ({
      coordinates: [
        { x: tick.coord, y: 0 },
        { x: tick.coord, y: axisLineSize + tickLineStyles.length }
      ]
    }))
  }

           createTickTexts (ticks            , _bounding          , styles           )              {
    const tickTickStyles = styles.tickText
    const axisLineSize = styles.axisLine.size
    const tickLineLength = styles.tickLine.length
    return ticks.map(tick => ({
      x: tick.coord,
      y: axisLineSize + tickLineLength + tickTickStyles.marginStart,
      text: tick.text,
      align: 'center',
      baseline: 'top'
    }))
  }
}


},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => YAxisView });
const $mod0 = $load(48);
const AxisView = $mod0.default;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */












class YAxisView extends AxisView        {
           getAxisStyles (styles        )            {
    return styles.yAxis
  }

           createAxisLine (bounding          , styles           )            {
    const yAxis = this.getWidget().getPane().getAxisComponent()
    const size = styles.axisLine.size
    let x
    if (yAxis.isFromZero()) {
      x = 0
    } else {
      x = bounding.width - size
    }
    return {
      coordinates: [
        { x, y: 0 },
        { x, y: bounding.height }
      ]
    }
  }

           createTickLines (ticks            , bounding          , styles           )              {
    const yAxis = this.getWidget().getPane().getAxisComponent()
    const axisLineStyles = styles.axisLine
    const tickLineStyles = styles.tickLine

    let startX = 0
    let endX = 0
    if (yAxis.isFromZero()) {
      startX = 0
      if (axisLineStyles.show) {
        startX += axisLineStyles.size
      }
      endX = startX + tickLineStyles.length
    } else {
      startX = bounding.width
      if (axisLineStyles.show) {
        startX -= axisLineStyles.size
      }
      endX = startX - tickLineStyles.length
    }
    return ticks.map(tick => ({
      coordinates: [
        { x: startX, y: tick.coord },
        { x: endX, y: tick.coord }
      ]
    }))
  }

           createTickTexts (ticks            , bounding          , styles           )              {
    const yAxis = this.getWidget().getPane().getAxisComponent()
    const axisLineStyles = styles.axisLine
    const tickLineStyles = styles.tickLine
    const tickTextStyles = styles.tickText

    let x = 0
    if (yAxis.isFromZero()) {
      x = tickTextStyles.marginStart
      if (axisLineStyles.show) {
        x += axisLineStyles.size
      }
      if (tickLineStyles.show) {
        x += tickLineStyles.length
      }
    } else {
      x = bounding.width - tickTextStyles.marginEnd
      if (axisLineStyles.show) {
        x -= axisLineStyles.size
      }
      if (tickLineStyles.show) {
        x -= tickLineStyles.length
      }
    }
    const textAlign = this.getWidget().getPane().getAxisComponent().isFromZero() ? 'left' : 'right'
    return ticks.map(tick => ({
      x,
      y: tick.coord,
      text: tick.text,
      align: textAlign,
      baseline: 'middle'
    }))
  }
}


},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => CandleWidget });
const $mod0 = $load(71);
const IndicatorWidget = $mod0.default;
const $mod2 = $load(50);
const CandleBarView = $mod2.default;
const $mod4 = $load(49);
const CandleAreaView = $mod4.default;
const $mod6 = $load(51);
const CandleHighLowPriceView = $mod6.default;
const $mod8 = $load(53);
const CandleLastPriceLineView = $mod8.default;
const $mod10 = $load(54);
const CandleTooltipView = $mod10.default;
const $mod12 = $load(23);
const CandleType = $mod12.CandleType;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

















class CandleWidget extends IndicatorWidget {
                   _candleBarView = new CandleBarView(this)
                   _candleAreaView = new CandleAreaView(this)
                   _candleHighLowPriceView = new CandleHighLowPriceView(this)
                   _candleLastPriceLineView = new CandleLastPriceLineView(this)

  constructor (rootContainer             , pane                 ) {
    super(rootContainer, pane)
    this.addChild(this._candleBarView)
  }

           updateMainContent (ctx                          )       {
    const candleStyles = this.getPane().getChart().getStyles().candle
    if (candleStyles.type !== CandleType.Area) {
      this._candleBarView.draw(ctx)
      this._candleHighLowPriceView.draw(ctx)
      this._candleAreaView.stopAnimation()
    } else {
      this._candleAreaView.draw(ctx)
    }
    this._candleLastPriceLineView.draw(ctx)
  }

           createTooltipView ()                       {
    return new CandleTooltipView(this)
  }
}


},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => DrawWidget });
const $mod0 = $load(26);
const UpdateLevel = $mod0.UpdateLevel;
const $mod2 = $load(8);
const Canvas = $mod2.default;
const $mod4 = $load(74);
const Widget = $mod4.default;
const $mod6 = $load(80);
const createDom = $mod6.createDom;
const $mod8 = $load(77);
const getPixelRatio = $mod8.getPixelRatio;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */












class DrawWidget                                extends Widget    {
                   _mainCanvas
                   _overlayCanvas

  constructor (rootContainer             , pane   ) {
    super(rootContainer, pane)
    this._mainCanvas = new Canvas({
      position: 'absolute',
      top: '0',
      left: '0',
      zIndex: '2',
      boxSizing: 'border-box'
    }, () => {
      this.updateMain(this._mainCanvas.getContext())
    })
    this._overlayCanvas = new Canvas({
      position: 'absolute',
      top: '0',
      left: '0',
      zIndex: '2',
      boxSizing: 'border-box'
    }, () => {
      this.updateOverlay(this._overlayCanvas.getContext())
    })
    const container = this.getContainer()
    container.appendChild(this._mainCanvas.getElement())
    container.appendChild(this._overlayCanvas.getElement())
  }

           createContainer ()              {
    return createDom('div', {
      margin: '0',
      padding: '0',
      position: 'absolute',
      top: '0',
      overflow: 'hidden',
      boxSizing: 'border-box',
      zIndex: '1'
    })
  }

           updateImp (container             , bounding          , level             )       {
    const { width, height, left } = bounding
    container.style.left = `${left}px`

    let l = level
    const w = container.clientWidth
    const h = container.clientHeight
    if (width !== w || height !== h) {
      container.style.width = `${width}px`
      container.style.height = `${height}px`
      l = UpdateLevel.Drawer
    }
    switch (l) {
      case UpdateLevel.Main: {
        this._mainCanvas.update(width, height)
        break
      }
      case UpdateLevel.Overlay: {
        this._overlayCanvas.update(width, height)
        break
      }
      case UpdateLevel.Drawer:
      case UpdateLevel.All: {
        this._mainCanvas.update(width, height)
        this._overlayCanvas.update(width, height)
        break
      }
    }
  }

  destroy ()       {
    this._mainCanvas.destroy()
    this._overlayCanvas.destroy()
  }

  getImage (includeOverlay         )                    {
    const { width, height } = this.getBounding()
    const canvas = createDom('canvas', {
      width: `${width}px`,
      height: `${height}px`,
      boxSizing: 'border-box'
    })
    const ctx = canvas.getContext('2d')
    const pixelRatio = getPixelRatio(canvas)
    canvas.width = width * pixelRatio
    canvas.height = height * pixelRatio
    ctx.scale(pixelRatio, pixelRatio)

    ctx.drawImage(this._mainCanvas.getElement(), 0, 0, width, height)

    if (includeOverlay) {
      ctx.drawImage(this._overlayCanvas.getElement(), 0, 0, width, height)
    }
    return canvas
  }



}


},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => IndicatorWidget });
const $mod0 = $load(73);
const WidgetNameConstants = $mod0.WidgetNameConstants;
const $mod2 = $load(70);
const DrawWidget = $mod2.default;
const $mod4 = $load(59);
const GridView = $mod4.default;
const $mod6 = $load(62);
const IndicatorView = $mod6.default;
const $mod8 = $load(57);
const CrosshairLineView = $mod8.default;
const $mod10 = $load(61);
const IndicatorTooltipView = $mod10.default;
const $mod12 = $load(63);
const OverlayView = $mod12.default;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */














class IndicatorWidget extends DrawWidget                  {
                   _gridView = new GridView(this)
                   _indicatorView = new IndicatorView(this)
                   _crosshairLineView = new CrosshairLineView(this)
                   _tooltipView = this.createTooltipView()
                   _overlayView = new OverlayView(this)

  constructor (rootContainer             , pane                 ) {
    super(rootContainer, pane)
    this.addChild(this._tooltipView)
    this.addChild(this._overlayView)
    this.getContainer().style.cursor = 'crosshair'
    this.registerEvent('mouseMoveEvent', () => {
      pane.getChart().getChartStore().getTooltipStore().setActiveIcon()
      return false
    })
  }

  getName ()         {
    return WidgetNameConstants.MAIN
  }

            updateMain (ctx                          )       {
    this.updateMainContent(ctx)
    this._indicatorView.draw(ctx)
    this._gridView.draw(ctx)
  }

            createTooltipView ()                       {
    return new IndicatorTooltipView(this)
  }

            updateMainContent (_ctx                          )       {}

           updateOverlay (ctx                          )       {
    this._overlayView.draw(ctx)
    this._crosshairLineView.draw(ctx)
    this._tooltipView.draw(ctx)
  }
}


},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => SeparatorWidget });
const $mod0 = $load(26);
const UpdateLevel = $mod0.UpdateLevel;
const $mod2 = $load(4);
const ActionType = $mod2.ActionType;
const $mod4 = $load(80);
const createDom = $mod4.createDom;
const $mod6 = $load(85);
const throttle = $mod6.throttle;
const $mod8 = $load(74);
const Widget = $mod8.default;
const $mod10 = $load(73);
const WidgetNameConstants = $mod10.WidgetNameConstants;
const REAL_SEPARATOR_HEIGHT = $mod10.REAL_SEPARATOR_HEIGHT;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */















class SeparatorWidget extends Widget                {
          _dragFlag = false
          _dragStartY = 0

          _topPaneHeight = 0
          _bottomPaneHeight = 0

  constructor (rootContainer             , pane               ) {
    super(rootContainer, pane)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    this.registerEvent('touchStartEvent', this._mouseDownEvent.bind(this))
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      .registerEvent('touchMoveEvent', this._pressedMouseMoveEvent.bind(this))
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      .registerEvent('touchEndEvent', this._mouseUpEvent.bind(this))
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      .registerEvent('mouseDownEvent', this._mouseDownEvent.bind(this))
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      .registerEvent('mouseUpEvent', this._mouseUpEvent.bind(this))
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      .registerEvent('pressedMouseMoveEvent', this._pressedMouseMoveEvent.bind(this))
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      .registerEvent('mouseEnterEvent', this._mouseEnterEvent.bind(this))
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      .registerEvent('mouseLeaveEvent', this._mouseLeaveEvent.bind(this))
  }

           getName ()         {
    return WidgetNameConstants.SEPARATOR
  }

           checkEventOn ()          {
    return true
  }

          _mouseDownEvent (event                 )          {
    this._dragFlag = true
    this._dragStartY = event.pageY
    const pane = this.getPane()
    this._topPaneHeight = pane.getTopPane().getBounding().height
    this._bottomPaneHeight = pane.getBottomPane().getBounding().height
    return true
  }

          _mouseUpEvent ()          {
    this._dragFlag = false
    return this._mouseLeaveEvent()
  }

  // eslint-disable-next-line @typescript-eslint/unbound-method
                   _pressedMouseMoveEvent = throttle(this._pressedTouchMouseMoveEvent, 20)

          _pressedTouchMouseMoveEvent (event                 )          {
    const dragDistance = event.pageY - this._dragStartY
    const currentPane = this.getPane()
    const topPane = currentPane.getTopPane()
    const bottomPane = currentPane.getBottomPane()
    const isUpDrag = dragDistance < 0
    if (
      topPane !== null &&
      bottomPane?.getOptions().dragEnabled
    ) {
      let reducedPane
      let increasedPane
      let startDragReducedPaneHeight
      let startDragIncreasedPaneHeight
      if (isUpDrag) {
        reducedPane = topPane
        increasedPane = bottomPane
        startDragReducedPaneHeight = this._topPaneHeight
        startDragIncreasedPaneHeight = this._bottomPaneHeight
      } else {
        reducedPane = bottomPane
        increasedPane = topPane
        startDragReducedPaneHeight = this._bottomPaneHeight
        startDragIncreasedPaneHeight = this._topPaneHeight
      }
      const reducedPaneMinHeight = reducedPane.getOptions().minHeight
      if (startDragReducedPaneHeight > reducedPaneMinHeight) {
        const reducedPaneHeight = Math.max(startDragReducedPaneHeight - Math.abs(dragDistance), reducedPaneMinHeight)
        const diffHeight = startDragReducedPaneHeight - reducedPaneHeight
        reducedPane.setBounding({ height: reducedPaneHeight })
        increasedPane.setBounding({ height: startDragIncreasedPaneHeight + diffHeight })
        const chart = currentPane.getChart()
        chart.getChartStore().getActionStore().execute(ActionType.OnPaneDrag, { paneId: currentPane.getId() })
        chart.adjustPaneViewport(true, true, true, true, true)
      }
    }
    return true
  }

          _mouseEnterEvent ()          {
    const pane = this.getPane()
    const bottomPane = pane.getBottomPane()
    if (bottomPane?.getOptions().dragEnabled ?? false) {
      const chart = pane.getChart()
      const styles = chart.getStyles().separator
      this.getContainer().style.background = styles.activeBackgroundColor
      return true
    }
    return false
  }

          _mouseLeaveEvent ()          {
    if (!this._dragFlag) {
      this.getContainer().style.background = ''
      return true
    }
    return false
  }

           createContainer ()              {
    return createDom('div', {
      width: '100%',
      height: `${REAL_SEPARATOR_HEIGHT}px`,
      margin: '0',
      padding: '0',
      position: 'absolute',
      top: '-3px',
      zIndex: '20',
      boxSizing: 'border-box',
      cursor: 'ns-resize'
    })
  }

           updateImp (container             , _bounding          , level             )       {
    if (level === UpdateLevel.All || level === UpdateLevel.Separator) {
      const styles = this.getPane().getChart().getStyles().separator
      container.style.top = `${-Math.floor((REAL_SEPARATOR_HEIGHT - styles.size) / 2)}px`
      container.style.height = `${REAL_SEPARATOR_HEIGHT}px`
    }
  }
}


},
function ($exports, $load) {
Object.defineProperty($exports, "WidgetNameConstants", { enumerable: true, get: () => WidgetNameConstants });
Object.defineProperty($exports, "REAL_SEPARATOR_HEIGHT", { enumerable: true, get: () => REAL_SEPARATOR_HEIGHT });

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const WidgetNameConstants = {
  MAIN: 'main',
  X_AXIS: 'xAxis',
  Y_AXIS: 'yAxis',
  SEPARATOR: 'separator'
}

const REAL_SEPARATOR_HEIGHT = 7


},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => Widget });
const $mod0 = $load(7);
const createDefaultBounding = $mod0.createDefaultBounding;
const $mod2 = $load(26);
const UpdateLevel = $mod2.UpdateLevel;
const $mod4 = $load(13);
const Eventful = $mod4.default;
const $mod6 = $load(87);
const merge = $mod6.merge;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */











class Widget                        extends Eventful                    {
  /**
   * root container
   */
                   _rootContainer

  /**
   * Parent pane
   */
                   _pane

  /**
   * wrapper container
   */
                   _container

                   _bounding           = createDefaultBounding()

  constructor (rootContainer             , pane   ) {
    super()
    this._pane = pane
    this._rootContainer = rootContainer
    this._container = this.createContainer()
    rootContainer.appendChild(this._container)
  }

  setBounding (bounding                   )       {
    merge(this._bounding, bounding)
    return this
  }

  getContainer ()              { return this._container }

  getBounding ()           {
    return this._bounding
  }

  getPane ()    {
    return this._pane
  }

  update (level              )       {
    this.updateImp(this._container, this._bounding, level ?? UpdateLevel.Drawer)
  }

  destroy ()       {
    this._rootContainer.removeChild(this._container)
  }






}


},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => XAxisWidget });
const $mod0 = $load(73);
const WidgetNameConstants = $mod0.WidgetNameConstants;
const $mod2 = $load(70);
const DrawWidget = $mod2.default;
const $mod4 = $load(67);
const XAxisView = $mod4.default;
const $mod6 = $load(64);
const OverlayXAxisView = $mod6.default;
const $mod8 = $load(58);
const CrosshairVerticalLabelView = $mod8.default;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */












class XAxisWidget extends DrawWidget                  {
                   _xAxisView = new XAxisView(this)
                   _overlayXAxisView = new OverlayXAxisView(this)
                   _crosshairVerticalLabelView = new CrosshairVerticalLabelView(this)

  constructor (rootContainer             , pane                 ) {
    super(rootContainer, pane)
    this.getContainer().style.cursor = 'ew-resize'
    this.addChild(this._overlayXAxisView)
  }

           getName ()         {
    return WidgetNameConstants.X_AXIS
  }

           updateMain (ctx                          )       {
    this._xAxisView.draw(ctx)
  }

           updateOverlay (ctx                          )       {
    this._overlayXAxisView.draw(ctx)
    this._crosshairVerticalLabelView.draw(ctx)
  }
}


},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => YAxisWidget });
const $mod0 = $load(73);
const WidgetNameConstants = $mod0.WidgetNameConstants;
const $mod2 = $load(70);
const DrawWidget = $mod2.default;
const $mod4 = $load(68);
const YAxisView = $mod4.default;
const $mod6 = $load(52);
const CandleLastPriceLabelView = $mod6.default;
const $mod8 = $load(60);
const IndicatorLastValueView = $mod8.default;
const $mod10 = $load(65);
const OverlayYAxisView = $mod10.default;
const $mod12 = $load(56);
const CrosshairHorizontalLabelView = $mod12.default;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */














class YAxisWidget extends DrawWidget                  {
                   _yAxisView = new YAxisView(this)
                   _candleLastPriceLabelView = new CandleLastPriceLabelView(this)
                   _indicatorLastValueView = new IndicatorLastValueView(this)
                   _overlayYAxisView = new OverlayYAxisView(this)
                   _crosshairHorizontalLabelView = new CrosshairHorizontalLabelView(this)

  constructor (rootContainer             , pane                 ) {
    super(rootContainer, pane)
    this.getContainer().style.cursor = 'ns-resize'
    this.addChild(this._overlayYAxisView)
  }

           getName ()         {
    return WidgetNameConstants.Y_AXIS
  }

           updateMain (ctx                          )       {
    this._yAxisView.draw(ctx)
    if (this.getPane().getAxisComponent().isInCandle()) {
      this._candleLastPriceLabelView.draw(ctx)
    }
    this._indicatorLastValueView.draw(ctx)
  }

           updateOverlay (ctx                          )       {
    this._overlayYAxisView.draw(ctx)
    this._crosshairHorizontalLabelView.draw(ctx)
  }
}


},
function ($exports, $load) {
Object.defineProperty($exports, "getPixelRatio", { enumerable: true, get: () => getPixelRatio });
Object.defineProperty($exports, "createFont", { enumerable: true, get: () => createFont });
Object.defineProperty($exports, "calcTextWidth", { enumerable: true, get: () => calcTextWidth });
const $mod0 = $load(87);
const isValid = $mod0.isValid;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */



let measureCtx

/**
 * Get pixel ratio
 * @param canvas
 * @returns {number}
 */
function getPixelRatio (canvas                   )         {
  return canvas.ownerDocument?.defaultView?.devicePixelRatio ?? 1
}

function createFont (size         , weight                  , family         )         {
  return `${weight ?? 'normal'} ${size ?? 12}px ${family ?? 'Helvetica Neue'}`
}

/**
 * Measure the width of text
 * @param text
 * @returns {number}
 */
function calcTextWidth (text        , size         , weight                  , family         )         {
  if (!isValid(measureCtx)) {
    const canvas = document.createElement('canvas')
    const pixelRatio = getPixelRatio(canvas)
    measureCtx = canvas.getContext('2d')
    measureCtx.scale(pixelRatio, pixelRatio)
  }
  measureCtx.font = createFont(size, weight, family)
  return Math.round(measureCtx.measureText(text).width)
}


},
function ($exports, $load) {
Object.defineProperty($exports, "isRgba", { enumerable: true, get: () => isRgba });
Object.defineProperty($exports, "isHsla", { enumerable: true, get: () => isHsla });
Object.defineProperty($exports, "isTransparent", { enumerable: true, get: () => isTransparent });

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

function isRgba (color        )          {
  return (/^[rR][gG][Bb][Aa]\(([\s]*(2[0-4][0-9]|25[0-5]|[01]?[0-9][0-9]?)[\s]*,){3}[\s]*(1|1.0|0|0.[0-9])[\s]*\){1}$/).test(color)
}

function isHsla (color        )          {
  return (/^[hH][Ss][Ll][Aa]\(([\s]*(360｜3[0-5][0-9]|[012]?[0-9][0-9]?)[\s]*,)([\s]*((100|[0-9][0-9]?)%|0)[\s]*,){2}([\s]*(1|1.0|0|0.[0-9])[\s]*)\)$/).test(color)
}

function isTransparent (color        )          {
  return color === 'transparent' ||
    color === 'none' ||
    /^[rR][gG][Bb][Aa]\(([\s]*(2[0-4][0-9]|25[0-5]|[01]?[0-9][0-9]?)[\s]*,){3}[\s]*0[\s]*\)$/.test(color) ||
    /^[hH][Ss][Ll][Aa]\(([\s]*(360｜3[0-5][0-9]|[012]?[0-9][0-9]?)[\s]*,)([\s]*((100|[0-9][0-9]?)%|0)[\s]*,){2}([\s]*0[\s]*)\)$/.test(color)
}


},
function ($exports, $load) {
Object.defineProperty($exports, "DEFAULT_REQUEST_ID", { enumerable: true, get: () => DEFAULT_REQUEST_ID });
Object.defineProperty($exports, "requestAnimationFrame", { enumerable: true, get: () => requestAnimationFrame });
Object.defineProperty($exports, "cancelAnimationFrame", { enumerable: true, get: () => cancelAnimationFrame });
Object.defineProperty($exports, "requestIdleCallback", { enumerable: true, get: () => requestIdleCallback });
Object.defineProperty($exports, "cancelIdleCallback", { enumerable: true, get: () => cancelIdleCallback });
const $mod0 = $load(87);
const isFunction = $mod0.isFunction;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */



const DEFAULT_REQUEST_ID = -1

function requestAnimationFrame (fn                      )         {
  if (isFunction(window.requestAnimationFrame)) {
    return window.requestAnimationFrame(fn)
  }
  return window.setTimeout(fn, 20)
}

function cancelAnimationFrame (id        )       {
  if (isFunction(window.cancelAnimationFrame)) {
    window.cancelAnimationFrame(id)
  } else {
    window.clearTimeout(id)
  }
}

function requestIdleCallback (fn                     )         {
  if (isFunction(window.requestIdleCallback)) {
    return window.requestIdleCallback(fn)
  }
  const startTime = performance.now()
  return window.setTimeout(function () {
    fn({
      didTimeout: false,
      timeRemaining () {
        return Math.max(0, 50 - (performance.now() - startTime))
      }
    })
  }, 1)
}

function cancelIdleCallback (id        )       {
  if (isFunction(window.cancelIdleCallback)) {
    window.cancelIdleCallback(id)
  } else {
    window.clearTimeout(id)
  }
}


},
function ($exports, $load) {
Object.defineProperty($exports, "createDom", { enumerable: true, get: () => createDom });

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Create dom
 * @param tagName
 * @param styles
 * @return {*}
 */
function createDom                                        (tagName   , styles                               )                           {
  const dom = document.createElement(tagName)
  const s = styles ?? {}
  for (const key in s) {
    (dom.style)[key] = s[key] ?? ''
  }
  return dom
}


},
function ($exports, $load) {
Object.defineProperty($exports, "formatValue", { enumerable: true, get: () => formatValue });
Object.defineProperty($exports, "formatDate", { enumerable: true, get: () => formatDate });
Object.defineProperty($exports, "formatPrecision", { enumerable: true, get: () => formatPrecision });
Object.defineProperty($exports, "formatBigNumber", { enumerable: true, get: () => formatBigNumber });
Object.defineProperty($exports, "formatThousands", { enumerable: true, get: () => formatThousands });
Object.defineProperty($exports, "formatFoldDecimal", { enumerable: true, get: () => formatFoldDecimal });
const $mod0 = $load(87);
const isNumber = $mod0.isNumber;
const isValid = $mod0.isValid;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */



const reEscapeChar = /\\(\\)?/g
const rePropName = RegExp(
  '[^.[\\]]+' + '|' +
  '\\[(?:' +
    '([^"\'][^[]*)' + '|' +
    '(["\'])((?:(?!\\2)[^\\\\]|\\\\.)*?)\\2' +
  ')\\]' + '|' +
  '(?=(?:\\.|\\[\\])(?:\\.|\\[\\]|$))'
  , 'g')

function formatValue (data         , key        , defaultValue          )          {
  if (isValid(data)) {
    const path           = []
    key.replace(rePropName, (subString        , ...args       ) => {
      let k = subString
      if (isValid(args[1])) {
        k = args[2].replace(reEscapeChar, '$1')
      } else if (isValid(args[0])) {
        k = args[0].trim()
      }
      path.push(k)
      return ''
    })
    let value = data
    let index = 0
    const length = path.length
    while (isValid(value) && index < length) {
      value = value?.[path[index++]]
    }
    return isValid(value) ? value : (defaultValue ?? '--')
  }
  return defaultValue ?? '--'
}

function formatDate (dateTimeFormat                     , timestamp        , format        )         {
  const date                         = {}
  dateTimeFormat.formatToParts(new Date(timestamp)).forEach(({ type, value }) => {
    switch (type) {
      case 'year': {
        date.YYYY = value
        break
      }
      case 'month': {
        date.MM = value
        break
      }
      case 'day': {
        date.DD = value
        break
      }
      case 'hour': {
        date.HH = value === '24' ? '00' : value
        break
      }
      case 'minute': {
        date.mm = value
        break
      }
      case 'second': {
        date.ss = value
        break
      }
    }
  })
  return format.replace(/YYYY|MM|DD|HH|mm|ss/g, key => date[key])
}

function formatPrecision (value                 , precision         )         {
  const v = +value
  if (isNumber(v)) {
    return v.toFixed(precision ?? 2)
  }
  return `${value}`
}

function formatBigNumber (value                 )         {
  const v = +value
  if (isNumber(v)) {
    if (v > 1000000000) {
      return `${+((v / 1000000000).toFixed(3))}B`
    }
    if (v > 1000000) {
      return `${+((v / 1000000).toFixed(3))}M`
    }
    if (v > 1000) {
      return `${+((v / 1000).toFixed(3))}K`
    }
  }
  return `${value}`
}

function formatThousands (value                 , sign        )         {
  const vl = `${value}`
  if (sign.length === 0) {
    return vl
  }
  if (vl.includes('.')) {
    const arr = vl.split('.')
    return `${arr[0].replace(/(\d)(?=(\d{3})+$)/g, $1 => `${$1}${sign}`)}.${arr[1]}`
  }
  return vl.replace(/(\d)(?=(\d{3})+$)/g, $1 => `${$1}${sign}`)
}

function formatFoldDecimal (value                 , threshold        )         {
  const vl = `${value}`
  const reg = new RegExp('\\.0{' + threshold + ',}[1-9][0-9]*$')
  if (reg.test(vl)) {
    const result = vl.split('.')
    const v = result[result.length - 1]
    const match = v.match(/0*/)
    if (isValid(match)) {
      const count = match[0].length
      result[result.length - 1] = v.replace(/0*/, `0{${count}}`)
      return result.join('.')
    }
  }
  return vl
}


},
function ($exports, $load) {
Object.defineProperty($exports, "createId", { enumerable: true, get: () => createId });

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

let baseId = 1
let prevIdTimestamp = new Date().getTime()

function createId (prefix         )         {
  const timestamp = new Date().getTime()
  if (timestamp === prevIdTimestamp) {
    ++baseId
  } else {
    baseId = 1
  }
  prevIdTimestamp = timestamp
  return `${prefix ?? ''}${timestamp}_${baseId}`
}


},
function ($exports, $load) {
Object.defineProperty($exports, "logWarn", { enumerable: true, get: () => logWarn });
Object.defineProperty($exports, "logError", { enumerable: true, get: () => logError });
Object.defineProperty($exports, "logTag", { enumerable: true, get: () => logTag });

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const DEV = "production" === 'development'

function log (templateText        , tagStyle        , messageStyle        , api        , invalidParam        , append        )       {
  if (DEV) {
    const apiStr = api !== '' ? `Call api \`${api}\`${invalidParam !== '' || append !== '' ? ', ' : '.'}` : ''
    const invalidParamStr = invalidParam !== '' ? `invalid parameter \`${invalidParam}\`${append !== '' ? ', ' : '.'}` : ''
    const appendStr = append !== '' ? append : ''
    console.log(templateText, tagStyle, messageStyle, apiStr, invalidParamStr, appendStr)
  }
}

function logWarn (api        , invalidParam        , append         )       {
  log(
    '%c😑 klinecharts warning%c %s%s%s',
    'padding:3px 4px;border-radius:2px;color:#ffffff;background-color:#FF9600',
    'color:#FF9600',
    api, invalidParam, append ?? ''
  )
}

function logError (api        , invalidParam        , append         )       {
  log(
    '%c😟 klinecharts error%c %s%s%s',
    'padding:3px 4px;border-radius:2px;color:#ffffff;background-color:#F92855;',
    'color:#F92855;',
    api, invalidParam, append ?? ''
  )
}

function logTag ()       {
  log(
    '%c❤️ Welcome to klinecharts. Version is 9.8.12',
    'border-radius:4px;border:dashed 1px #1677FF;line-height:70px;padding:0 20px;margin:16px 0;font-size:14px;color:#1677FF;',
    '',
    '',
    '',
    ''
  )
}


},
function ($exports, $load) {
Object.defineProperty($exports, "binarySearchNearest", { enumerable: true, get: () => binarySearchNearest });
Object.defineProperty($exports, "nice", { enumerable: true, get: () => nice });
Object.defineProperty($exports, "round", { enumerable: true, get: () => round });
Object.defineProperty($exports, "getPrecision", { enumerable: true, get: () => getPrecision });
Object.defineProperty($exports, "getMaxMin", { enumerable: true, get: () => getMaxMin });
Object.defineProperty($exports, "log10", { enumerable: true, get: () => log10 });
Object.defineProperty($exports, "index10", { enumerable: true, get: () => index10 });

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Binary search for the nearest result
 * @param dataList
 * @param valueKey
 * @param targetValue
 * @return {number}
 */
function binarySearchNearest    (dataList     , valueKey         , targetValue     )         {
  let left = 0
  let right = 0
  for (right = dataList.length - 1; left !== right;) {
    const midIndex = Math.floor((right + left) / 2)
    const mid = right - left
    const midValue = dataList[midIndex][valueKey]
    if (targetValue === dataList[left][valueKey]) {
      return left
    }
    if (targetValue === dataList[right][valueKey]) {
      return right
    }
    if (targetValue === midValue) {
      return midIndex
    }

    if (targetValue > midValue) {
      left = midIndex
    } else {
      right = midIndex
    }

    if (mid <= 2) {
      break
    }
  }
  return left
}

/**
 * 优化数字
 * @param value
 * @return {number|number}
 */
function nice (value        )         {
  const exponent = Math.floor(log10(value))
  const exp10 = index10(exponent)
  const f = value / exp10 // 1 <= f < 10
  let nf = 0
  if (f < 1.5) {
    nf = 1
  } else if (f < 2.5) {
    nf = 2
  } else if (f < 3.5) {
    nf = 3
  } else if (f < 4.5) {
    nf = 4
  } else if (f < 5.5) {
    nf = 5
  } else if (f < 6.5) {
    nf = 6
  } else {
    nf = 8
  }
  value = nf * exp10
  return exponent >= -20 ? +value.toFixed(exponent < 0 ? -exponent : 0) : value
}

/**
 * 四舍五入
 * @param value
 * @param precision
 * @return {number}
 */
function round (value        , precision        )         {
  if (precision == null) {
    precision = 10
  }
  precision = Math.min(Math.max(0, precision), 20)
  const v = (+value).toFixed(precision)
  return +v
}

/**
 * 获取小数位数
 * @param value
 * @return {number|number}
 */
function getPrecision (value        )         {
  const str = value.toString()
  const eIndex = str.indexOf('e')
  if (eIndex > 0) {
    const precision = +str.slice(eIndex + 1)
    return precision < 0 ? -precision : 0
  } else {
    const dotIndex = str.indexOf('.')
    return dotIndex < 0 ? 0 : str.length - 1 - dotIndex
  }
}

function getMaxMin    (dataList     , maxKey         , minKey         )           {
  const maxMin = [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER]
  dataList.forEach(data => {
    maxMin[0] = Math.max((data[maxKey] ?? data)          , maxMin[0])
    maxMin[1] = Math.min((data[minKey] ?? data)          , maxMin[1])
  })
  return maxMin
}

/**
 * 10为底的对数函数
 * @param value
 * @return {number}
 */
function log10 (value        )         {
  return Math.log(value) / Math.log(10)
}

/**
 * 10的指数函数
 * @param value
 * @return {number}
 */
function index10 (value        )         {
  return Math.pow(10, value)
}


},
function ($exports, $load) {
Object.defineProperty($exports, "throttle", { enumerable: true, get: () => throttle });

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

function throttle (func                         , wait         )             {
  let previous = 0
  return function () {
    const now = Date.now()
    if (now - previous > (wait ?? 20)) {
      func.apply(this, arguments)
      previous = now
    }
  }
}

// export function memoize<R1 = any, R2 = any> (func: (...args: any[]) => R1, resolver?: (...args: any[]) => R2): (...args: any[]) => R1 {
//   if (!isFunction(func) || (isValid(resolver) && !isFunction(resolver))) {
//     throw new TypeError('Expected a function')
//   }
//   const memoized = function (...args: any[]): any {
//     const key = isFunction(resolver) ? resolver.apply(this, args) : args[0]
//     const cache = memoized.cache

//     if (cache.has(key)) {
//       return cache.get(key)
//     }
//     const result = func.apply(this, args)
//     // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
//     memoized.cache = cache.set(key, result) || cache
//     return result
//   }
//   // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
//   memoized.cache = new (memoize.Cache || Map)()
//   return memoized
// }
// memoize.Cache = Map


},
function ($exports, $load) {
Object.defineProperty($exports, "isFF", { enumerable: true, get: () => isFF });
Object.defineProperty($exports, "isIOS", { enumerable: true, get: () => isIOS });

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

function isFF ()          {
  if (typeof window === 'undefined') {
    return false
  }
  return (window.navigator.userAgent.toLowerCase().indexOf('firefox') ?? -1) > -1
}

function isIOS ()          {
  if (typeof window === 'undefined') {
    return false
  }
  return /iPhone|iPad|iPod/.test(window.navigator.platform)
}


},
function ($exports, $load) {
Object.defineProperty($exports, "merge", { enumerable: true, get: () => merge });
Object.defineProperty($exports, "clone", { enumerable: true, get: () => clone });
Object.defineProperty($exports, "isArray", { enumerable: true, get: () => isArray });
Object.defineProperty($exports, "isFunction", { enumerable: true, get: () => isFunction });
Object.defineProperty($exports, "isObject", { enumerable: true, get: () => isObject });
Object.defineProperty($exports, "isNumber", { enumerable: true, get: () => isNumber });
Object.defineProperty($exports, "isValid", { enumerable: true, get: () => isValid });
Object.defineProperty($exports, "isBoolean", { enumerable: true, get: () => isBoolean });
Object.defineProperty($exports, "isString", { enumerable: true, get: () => isString });

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

function merge (target     , source     )       {
  if ((!isObject(target) && !isObject(source))) {
    return
  }
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)           ) {
      const targetProp = target[key]
      const sourceProp = source[key]
      if (
        isObject(sourceProp) &&
        isObject(targetProp)
      ) {
        merge(targetProp, sourceProp)
      } else {
        if (isValid(source[key])) {
          target[key] = clone(source[key])
        }
      }
    }
  }
}

function clone    (target   )    {
  if (!isObject(target)) {
    return target
  }

  let copy
  if (isArray(target)) {
    copy = []
  } else {
    copy = {}
  }
  for (const key in target) {
    if (Object.prototype.hasOwnProperty.call(target, key)           ) {
      const v = target[key]
      if (isObject(v)) {
        copy[key] = clone(v)
      } else {
        copy[key] = v
      }
    }
  }
  return copy
}

function isArray          (value     )               {
  return Object.prototype.toString.call(value) === '[object Array]'
}

function isFunction                            (value     )             {
  return typeof value === 'function'
}

function isObject (value     )                  {
  return (typeof value === 'object') && isValid(value)
}

function isNumber (value     )                  {
  return typeof value === 'number' && !isNaN(value)
}

function isValid    (value                      )             {
  return value !== null && value !== undefined
}

function isBoolean (value     )                   {
  return typeof value === 'boolean'
}

function isString (value     )                  {
  return typeof value === 'string'
}


},
function ($exports, $load) {
Object.defineProperty($exports, "checkCoordinateOnArc", { enumerable: true, get: () => checkCoordinateOnArc });
Object.defineProperty($exports, "drawArc", { enumerable: true, get: () => drawArc });
Object.defineProperty($exports, "default", { enumerable: true, get: () => arc });
const $mod0 = $load(9);
const getDistance = $mod0.getDistance;
const $mod2 = $load(23);
const LineType = $mod2.LineType;
const $mod4 = $load(30);
const DEVIATION = $mod4.DEVIATION;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */









function checkCoordinateOnArc (coordinate            , attrs                       )          {
  let arcs             = []
  arcs = arcs.concat(attrs)
  for (let i = 0; i < arcs.length; i++) {
    const arc = arcs[i]
    if (Math.abs(getDistance(coordinate, arc) - arc.r) < DEVIATION) {
      const { r, startAngle, endAngle } = arc
      const startCoordinateX = r * Math.cos(startAngle) + arc.x
      const startCoordinateY = r * Math.sin(startAngle) + arc.y
      const endCoordinateX = r * Math.cos(endAngle) + arc.x
      const endCoordinateY = r * Math.sin(endAngle) + arc.y
      if (
        coordinate.x <= Math.max(startCoordinateX, endCoordinateX) + DEVIATION &&
        coordinate.x >= Math.min(startCoordinateX, endCoordinateX) - DEVIATION &&
        coordinate.y <= Math.max(startCoordinateY, endCoordinateY) + DEVIATION &&
        coordinate.y >= Math.min(startCoordinateY, endCoordinateY) - DEVIATION
      ) {
        return true
      }
    }
  }

  return false
}

function drawArc (ctx                          , attrs                       , styles                    )       {
  let arcs             = []
  arcs = arcs.concat(attrs)
  const { style = LineType.Solid, size = 1, color = 'currentColor', dashedValue = [2, 2] } = styles
  ctx.lineWidth = size
  ctx.strokeStyle = color
  if (style === LineType.Dashed) {
    ctx.setLineDash(dashedValue)
  } else {
    ctx.setLineDash([])
  }
  arcs.forEach(({ x, y, r, startAngle, endAngle }) => {
    ctx.beginPath()
    ctx.arc(x, y, r, startAngle, endAngle)
    ctx.stroke()
    ctx.closePath()
  })
}






const arc                                                            = {
  name: 'arc',
  checkEventOn: checkCoordinateOnArc,
  draw: (ctx                          , attrs                       , styles                    ) => {
    drawArc(ctx, attrs, styles)
  }
}




},
function ($exports, $load) {
Object.defineProperty($exports, "checkCoordinateOnCircle", { enumerable: true, get: () => checkCoordinateOnCircle });
Object.defineProperty($exports, "drawCircle", { enumerable: true, get: () => drawCircle });
Object.defineProperty($exports, "default", { enumerable: true, get: () => circle });
const $mod0 = $load(23);
const PolygonType = $mod0.PolygonType;
const LineType = $mod0.LineType;
const $mod3 = $load(87);
const isString = $mod3.isString;
const $mod5 = $load(78);
const isTransparent = $mod5.isTransparent;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */








function checkCoordinateOnCircle (coordinate            , attrs                             )          {
  let circles                = []
  circles = circles.concat(attrs)

  for (let i = 0; i < circles.length; i++) {
    const { x, y, r } = circles[i]
    const difX = coordinate.x - x
    const difY = coordinate.y - y
    if (!(difX * difX + difY * difY > r * r)) {
      return true
    }
  }
  return false
}

function drawCircle (ctx                          , attrs                             , styles                       )       {
  let circles                = []
  circles = circles.concat(attrs)

  const {
    style = PolygonType.Fill,
    color = 'currentColor',
    borderSize = 1,
    borderColor = 'currentColor',
    borderStyle = LineType.Solid,
    borderDashedValue = [2, 2]
  } = styles

  const solid = (style === PolygonType.Fill || styles.style === PolygonType.StrokeFill) && (!isString(color) || !isTransparent(color))
  if (solid) {
    ctx.fillStyle = color
    circles.forEach(({ x, y, r }) => {
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.closePath()
      ctx.fill()
    })
  }
  if ((style === PolygonType.Stroke || styles.style === PolygonType.StrokeFill) && borderSize > 0 && !isTransparent(borderColor)) {
    ctx.strokeStyle = borderColor
    ctx.lineWidth = borderSize
    if (borderStyle === LineType.Dashed) {
      ctx.setLineDash(borderDashedValue)
    } else {
      ctx.setLineDash([])
    }
    circles.forEach(({ x, y, r }) => {
      if (!solid || r > borderSize) {
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.closePath()
        ctx.stroke()
      }
    })
  }
}







const circle                                                                     = {
  name: 'circle',
  checkEventOn: checkCoordinateOnCircle,
  draw: (ctx                          , attrs                             , styles                       ) => {
    drawCircle(ctx, attrs, styles)
  }
}




},
function ($exports, $load) {
Object.defineProperty($exports, "getSupportedFigures", { enumerable: true, get: () => getSupportedFigures });
Object.defineProperty($exports, "getFigureClass", { enumerable: true, get: () => getFigureClass });
Object.defineProperty($exports, "getInnerFigureClass", { enumerable: true, get: () => getInnerFigureClass });
Object.defineProperty($exports, "registerFigure", { enumerable: true, get: () => registerFigure });
const $mod0 = $load(30);
const FigureImp = $mod0.default;
const $mod2 = $load(89);
const circle = $mod2.default;
const $mod4 = $load(91);
const line = $mod4.default;
const $mod6 = $load(92);
const polygon = $mod6.default;
const $mod8 = $load(93);
const rect = $mod8.default;
const $mod10 = $load(95);
const text = $mod10.default;
const $mod12 = $load(94);
const rectText = $mod12.default;
const $mod14 = $load(88);
const arc = $mod14.default;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */













const figures                                         = {}

const extensions = [circle, line, polygon, rect, text, rectText, arc]
extensions.forEach((figure                ) => {
  figures[figure.name] = FigureImp.extend(figure)
})

function getSupportedFigures ()           {
  return Object.keys(figures)
}

function registerFigure                   (figure                      )       {
  figures[figure.name] = FigureImp.extend(figure)
}

function getInnerFigureClass                   (name        )                                         {
  return figures[name] ?? null
}

function getFigureClass                   (name        )                                    {
  return figures[name] ?? null
}




},
function ($exports, $load) {
Object.defineProperty($exports, "checkCoordinateOnLine", { enumerable: true, get: () => checkCoordinateOnLine });
Object.defineProperty($exports, "getLinearYFromSlopeIntercept", { enumerable: true, get: () => getLinearYFromSlopeIntercept });
Object.defineProperty($exports, "getLinearYFromCoordinates", { enumerable: true, get: () => getLinearYFromCoordinates });
Object.defineProperty($exports, "getLinearSlopeIntercept", { enumerable: true, get: () => getLinearSlopeIntercept });
Object.defineProperty($exports, "lineTo", { enumerable: true, get: () => lineTo });
Object.defineProperty($exports, "drawLine", { enumerable: true, get: () => drawLine });
Object.defineProperty($exports, "default", { enumerable: true, get: () => line });
const $mod0 = $load(23);
const LineType = $mod0.LineType;
const $mod2 = $load(30);
const DEVIATION = $mod2.DEVIATION;
const $mod4 = $load(87);
const isNumber = $mod4.isNumber;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */








function checkCoordinateOnLine (coordinate            , attrs                         )          {
  let lines              = []
  lines = lines.concat(attrs)

  for (let i = 0; i < lines.length; i++) {
    const { coordinates } = lines[i]
    if (coordinates.length > 1) {
      for (let i = 1; i < coordinates.length; i++) {
        const prevCoordinate = coordinates[i - 1]
        const currentCoordinate = coordinates[i]
        if (prevCoordinate.x === currentCoordinate.x) {
          if (
            Math.abs(prevCoordinate.y - coordinate.y) + Math.abs(currentCoordinate.y - coordinate.y) - Math.abs(prevCoordinate.y - currentCoordinate.y) < DEVIATION + DEVIATION &&
            Math.abs(coordinate.x - prevCoordinate.x) < DEVIATION
          ) {
            return true
          }
        } else {
          const kb = getLinearSlopeIntercept(prevCoordinate, currentCoordinate)
          const y = getLinearYFromSlopeIntercept(kb, coordinate)
          const yDif = Math.abs(y - coordinate.y)
          if (
            Math.abs(prevCoordinate.x - coordinate.x) + Math.abs(currentCoordinate.x - coordinate.x) - Math.abs(prevCoordinate.x - currentCoordinate.x) < DEVIATION + DEVIATION &&
            yDif * yDif / (kb[0] * kb[0] + 1) < DEVIATION * DEVIATION
          ) {
            return true
          }
        }
      }
    }
  }
  return false
}

function getLinearYFromSlopeIntercept (kb                    , coordinate            )         {
  if (kb !== null) {
    return coordinate.x * kb[0] + kb[1]
  }
  return coordinate.y
}

/**
 * 获取点在两点决定的一次函数上的y值
 * @param coordinate1
 * @param coordinate2
 * @param targetCoordinate
 */
function getLinearYFromCoordinates (coordinate1            , coordinate2            , targetCoordinate            )         {
  const kb = getLinearSlopeIntercept(coordinate1, coordinate2)
  return getLinearYFromSlopeIntercept(kb, targetCoordinate)
}

function getLinearSlopeIntercept (coordinate1            , coordinate2            )                     {
  const difX = coordinate1.x - coordinate2.x
  if (difX !== 0) {
    const k = (coordinate1.y - coordinate2.y) / difX
    const b = coordinate1.y - k * coordinate1.x
    return [k, b]
  }
  return null
}

function lineTo (ctx                          , coordinates              , smooth                  )       {
  const length = coordinates.length
  const smoothParam = isNumber(smooth) ? (smooth > 0 && smooth < 1 ? smooth : 0) : (smooth ? 0.5 : 0)
  if ((smoothParam > 0) && length > 2) {
    let cpx0 = coordinates[0].x
    let cpy0 = coordinates[0].y
    for (let i = 1; i < length - 1; i++) {
      const prevCoordinate = coordinates[i - 1]
      const coordinate = coordinates[i]
      const nextCoordinate = coordinates[i + 1]
      const dx01 = coordinate.x - prevCoordinate.x
      const dy01 = coordinate.y - prevCoordinate.y
      const dx12 = nextCoordinate.x - coordinate.x
      const dy12 = nextCoordinate.y - coordinate.y
      let dx02 = nextCoordinate.x - prevCoordinate.x
      let dy02 = nextCoordinate.y - prevCoordinate.y
      const prevSegmentLength = Math.sqrt(dx01 * dx01 + dy01 * dy01)
      const nextSegmentLength = Math.sqrt(dx12 * dx12 + dy12 * dy12)
      const segmentLengthRatio = nextSegmentLength / (nextSegmentLength + prevSegmentLength)

      let nextCpx = coordinate.x + dx02 * smoothParam * segmentLengthRatio
      let nextCpy = coordinate.y + dy02 * smoothParam * segmentLengthRatio
      nextCpx = Math.min(nextCpx, Math.max(nextCoordinate.x, coordinate.x))
      nextCpy = Math.min(nextCpy, Math.max(nextCoordinate.y, coordinate.y))
      nextCpx = Math.max(nextCpx, Math.min(nextCoordinate.x, coordinate.x))
      nextCpy = Math.max(nextCpy, Math.min(nextCoordinate.y, coordinate.y))

      dx02 = nextCpx - coordinate.x
      dy02 = nextCpy - coordinate.y

      let cpx1 = coordinate.x - dx02 * prevSegmentLength / nextSegmentLength
      let cpy1 = coordinate.y - dy02 * prevSegmentLength / nextSegmentLength

      cpx1 = Math.min(cpx1, Math.max(prevCoordinate.x, coordinate.x))
      cpy1 = Math.min(cpy1, Math.max(prevCoordinate.y, coordinate.y))
      cpx1 = Math.max(cpx1, Math.min(prevCoordinate.x, coordinate.x))
      cpy1 = Math.max(cpy1, Math.min(prevCoordinate.y, coordinate.y))

      dx02 = coordinate.x - cpx1
      dy02 = coordinate.y - cpy1
      nextCpx = coordinate.x + dx02 * nextSegmentLength / prevSegmentLength
      nextCpy = coordinate.y + dy02 * nextSegmentLength / prevSegmentLength

      ctx.bezierCurveTo(cpx0, cpy0, cpx1, cpy1, coordinate.x, coordinate.y)

      cpx0 = nextCpx
      cpy0 = nextCpy
    }
    const lastCoordinate = coordinates[length - 1]
    ctx.bezierCurveTo(cpx0, cpy0, lastCoordinate.x, lastCoordinate.y, lastCoordinate.x, lastCoordinate.y)
  } else {
    for (let i = 1; i < length; i++) {
      ctx.lineTo(coordinates[i].x, coordinates[i].y)
    }
  }
}

function drawLine (ctx                          , attrs                         , styles                          )       {
  let lines              = []
  lines = lines.concat(attrs)
  const { style = LineType.Solid, smooth = false, size = 1, color = 'currentColor', dashedValue = [2, 2] } = styles
  ctx.lineWidth = size
  ctx.strokeStyle = color
  if (style === LineType.Dashed) {
    ctx.setLineDash(dashedValue)
  } else {
    ctx.setLineDash([])
  }
  const correction = size % 2 === 1 ? 0.5 : 0
  lines.forEach(({ coordinates }) => {
    if (coordinates.length > 1) {
      if (
        coordinates.length === 2 &&
        (
          coordinates[0].x === coordinates[1].x ||
          coordinates[0].y === coordinates[1].y
        )
      ) {
        ctx.beginPath()
        if (coordinates[0].x === coordinates[1].x) {
          ctx.moveTo(coordinates[0].x + correction, coordinates[0].y)
          ctx.lineTo(coordinates[1].x + correction, coordinates[1].y)
        } else {
          ctx.moveTo(coordinates[0].x, coordinates[0].y + correction)
          ctx.lineTo(coordinates[1].x, coordinates[1].y + correction)
        }
        ctx.stroke()
        ctx.closePath()
      } else {
        ctx.save()
        if (size % 2 === 1) {
          ctx.translate(0.5, 0.5)
        }
        ctx.beginPath()
        ctx.moveTo(coordinates[0].x, coordinates[0].y)
        lineTo(ctx, coordinates, smooth)
        ctx.stroke()
        ctx.closePath()
        ctx.restore()
      }
    }
  })
}





const line                                                                    = {
  name: 'line',
  checkEventOn: checkCoordinateOnLine,
  draw: (ctx                          , attrs                         , styles                          ) => {
    drawLine(ctx, attrs, styles)
  }
}




},
function ($exports, $load) {
Object.defineProperty($exports, "checkCoordinateOnPolygon", { enumerable: true, get: () => checkCoordinateOnPolygon });
Object.defineProperty($exports, "drawPolygon", { enumerable: true, get: () => drawPolygon });
Object.defineProperty($exports, "default", { enumerable: true, get: () => polygon });
const $mod0 = $load(23);
const PolygonType = $mod0.PolygonType;
const LineType = $mod0.LineType;
const $mod3 = $load(87);
const isString = $mod3.isString;
const $mod5 = $load(78);
const isTransparent = $mod5.isTransparent;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */








function checkCoordinateOnPolygon (coordinate            , attrs                               )          {
  let polygons                 = []
  polygons = polygons.concat(attrs)
  for (let i = 0; i < polygons.length; i++) {
    let on = false
    const { coordinates } = polygons[i]
    for (let i = 0, j = coordinates.length - 1; i < coordinates.length; j = i++) {
      if (
        (coordinates[i].y > coordinate.y) !== (coordinates[j].y > coordinate.y) &&
        (coordinate.x < (coordinates[j].x - coordinates[i].x) * (coordinate.y - coordinates[i].y) / (coordinates[j].y - coordinates[i].y) + coordinates[i].x)
      ) {
        on = !on
      }
    }
    if (on) {
      return true
    }
  }
  return false
}

function drawPolygon (ctx                          , attrs                               , styles                       )       {
  let polygons                 = []
  polygons = polygons.concat(attrs)
  const {
    style = PolygonType.Fill,
    color = 'currentColor',
    borderSize = 1,
    borderColor = 'currentColor',
    borderStyle = LineType.Solid,
    borderDashedValue = [2, 2]
  } = styles
  if (
    (style === PolygonType.Fill || styles.style === PolygonType.StrokeFill) &&
    (!isString(color) || !isTransparent(color))) {
    ctx.fillStyle = color
    polygons.forEach(({ coordinates }) => {
      ctx.beginPath()
      ctx.moveTo(coordinates[0].x, coordinates[0].y)
      for (let i = 1; i < coordinates.length; i++) {
        ctx.lineTo(coordinates[i].x, coordinates[i].y)
      }
      ctx.closePath()
      ctx.fill()
    })
  }
  if ((style === PolygonType.Stroke || styles.style === PolygonType.StrokeFill) && borderSize > 0 && !isTransparent(borderColor)) {
    ctx.strokeStyle = borderColor
    ctx.lineWidth = borderSize
    if (borderStyle === LineType.Dashed) {
      ctx.setLineDash(borderDashedValue)
    } else {
      ctx.setLineDash([])
    }
    polygons.forEach(({ coordinates }) => {
      ctx.beginPath()
      ctx.moveTo(coordinates[0].x, coordinates[0].y)
      for (let i = 1; i < coordinates.length; i++) {
        ctx.lineTo(coordinates[i].x, coordinates[i].y)
      }
      ctx.closePath()
      ctx.stroke()
    })
  }
}





const polygon                                                                       = {
  name: 'polygon',
  checkEventOn: checkCoordinateOnPolygon,
  draw: (ctx                          , attrs                               , styles                       ) => {
    drawPolygon(ctx, attrs, styles)
  }
}




},
function ($exports, $load) {
Object.defineProperty($exports, "checkCoordinateOnRect", { enumerable: true, get: () => checkCoordinateOnRect });
Object.defineProperty($exports, "drawRect", { enumerable: true, get: () => drawRect });
Object.defineProperty($exports, "default", { enumerable: true, get: () => rect });
const $mod0 = $load(23);
const PolygonType = $mod0.PolygonType;
const LineType = $mod0.LineType;
const $mod3 = $load(78);
const isTransparent = $mod3.isTransparent;
const $mod5 = $load(87);
const isString = $mod5.isString;
const $mod7 = $load(30);
const DEVIATION = $mod7.DEVIATION;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */








function checkCoordinateOnRect (coordinate            , attrs                         )          {
  let rects              = []
  rects = rects.concat(attrs)
  for (let i = 0; i < rects.length; i++) {
    const rect = rects[i]
    let x = rect.x
    let width = rect.width
    if (width < DEVIATION * 2) {
      x -= DEVIATION
      width = DEVIATION * 2
    }
    let y = rect.y
    let height = rect.height
    if (height < DEVIATION * 2) {
      y -= DEVIATION
      height = DEVIATION * 2
    }
    if (
      coordinate.x >= x &&
      coordinate.x <= x + width &&
      coordinate.y >= y &&
      coordinate.y <= y + height
    ) {
      return true
    }
  }
  return false
}

function drawRect (ctx                          , attrs                         , styles                    )       {
  let rects              = []
  rects = rects.concat(attrs)
  const {
    style = PolygonType.Fill,
    color = 'transparent',
    borderSize = 1,
    borderColor = 'transparent',
    borderStyle = LineType.Solid,
    borderRadius: r = 0,
    borderDashedValue = [2, 2]
  } = styles
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const draw = ctx.roundRect ?? ctx.rect
  const solid = (style === PolygonType.Fill || styles.style === PolygonType.StrokeFill) && (!isString(color) || !isTransparent(color))
  if (solid) {
    ctx.fillStyle = color
    rects.forEach(({ x, y, width: w, height: h }) => {
      ctx.beginPath()
      draw.call(ctx, x, y, w, h, r)
      ctx.closePath()
      ctx.fill()
    })
  }
  if ((style === PolygonType.Stroke || styles.style === PolygonType.StrokeFill) && borderSize > 0 && !isTransparent(borderColor)) {
    ctx.strokeStyle = borderColor
    ctx.fillStyle = borderColor
    ctx.lineWidth = borderSize
    if (borderStyle === LineType.Dashed) {
      ctx.setLineDash(borderDashedValue)
    } else {
      ctx.setLineDash([])
    }
    const correction = borderSize % 2 === 1 ? 0.5 : 0
    const doubleCorrection = Math.round(correction * 2)
    rects.forEach(({ x, y, width: w, height: h }) => {
      if (w > borderSize * 2 && h > borderSize * 2) {
        ctx.beginPath()
        draw.call(ctx, x + correction, y + correction, w - doubleCorrection, h - doubleCorrection, r)
        ctx.closePath()
        ctx.stroke()
      } else {
        if (!solid) {
          ctx.fillRect(x, y, w, h)
        }
      }
    })
  }
}








const rect                                                              = {
  name: 'rect',
  checkEventOn: checkCoordinateOnRect,
  draw: (ctx                          , attrs                         , styles                    ) => {
    drawRect(ctx, attrs, styles)
  }
}




},
function ($exports, $load) {
Object.defineProperty($exports, "drawRectText", { enumerable: true, get: () => drawRectText });
Object.defineProperty($exports, "default", { enumerable: true, get: () => rectText });
const $mod0 = $load(95);
const text = $mod0.default;
const drawText = $mod0.drawText;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */



/**
 * @deprecated
 * Starting from v10, it will be deleted
 */
const rectText = text

/**
 * @deprecated
 * Starting from v10, it will be deleted
 */
const drawRectText = drawText

/**
 * @deprecated
 * Starting from v10, it will be deleted
 */





},
function ($exports, $load) {
Object.defineProperty($exports, "getTextRect", { enumerable: true, get: () => getTextRect });
Object.defineProperty($exports, "checkCoordinateOnText", { enumerable: true, get: () => checkCoordinateOnText });
Object.defineProperty($exports, "drawText", { enumerable: true, get: () => drawText });
Object.defineProperty($exports, "default", { enumerable: true, get: () => text });
const $mod0 = $load(77);
const createFont = $mod0.createFont;
const calcTextWidth = $mod0.calcTextWidth;
const $mod3 = $load(93);
const drawRect = $mod3.drawRect;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */










function getTextRect (attrs           , styles                    )            {
  const { size = 12, paddingLeft = 0, paddingTop = 0, paddingRight = 0, paddingBottom = 0, weight = 'normal', family } = styles
  const { x, y, text, align = 'left', baseline = 'top', width: w, height: h } = attrs
  const width = w ?? (paddingLeft + calcTextWidth(text, size, weight, family) + paddingRight)
  const height = h ?? (paddingTop + size + paddingBottom)
  let startX
  switch (align) {
    case 'left':
    case 'start': {
      startX = x
      break
    }
    case 'right':
    case 'end': {
      startX = x - width
      break
    }
    default: {
      startX = x - width / 2
      break
    }
  }
  let startY
  switch (baseline) {
    case 'top':
    case 'hanging': {
      startY = y
      break
    }
    case 'bottom':
    case 'ideographic':
    case 'alphabetic': {
      startY = y - height
      break
    }
    default: {
      startY = y - height / 2
      break
    }
  }
  return { x: startX, y: startY, width, height }
}

function checkCoordinateOnText (coordinate            , attrs                         , styles                    )          {
  let texts              = []
  texts = texts.concat(attrs)
  for (let i = 0; i < texts.length; i++) {
    const { x, y, width, height } = getTextRect(texts[i], styles)
    if (
      coordinate.x >= x &&
      coordinate.x <= x + width &&
      coordinate.y >= y &&
      coordinate.y <= y + height
    ) {
      return true
    }
  }
  return false
}

function drawText (ctx                          , attrs                         , styles                    )       {
  let texts              = []
  texts = texts.concat(attrs)
  const {
    color = 'currentColor',
    size = 12,
    family,
    weight,
    paddingLeft = 0,
    paddingTop = 0,
    paddingRight = 0
  } = styles
  const rects = texts.map(text => getTextRect(text, styles))
  drawRect(ctx, rects, { ...styles, color: styles.backgroundColor })

  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.font = createFont(size, weight, family)
  ctx.fillStyle = color

  texts.forEach((text, index) => {
    const rect = rects[index]
    ctx.fillText(text.text, rect.x + paddingLeft, rect.y + paddingTop, rect.width - paddingLeft - paddingRight)
  })
}











const text                                                              = {
  name: 'text',
  checkEventOn: checkCoordinateOnText,
  draw: (ctx                          , attrs                         , styles                    ) => {
    drawText(ctx, attrs, styles)
  }
}




},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => enUS });

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */



const enUS          = {
  time: 'Time: ',
  open: 'Open: ',
  high: 'High: ',
  low: 'Low: ',
  close: 'Close: ',
  volume: 'Volume: ',
  turnover: 'Turnover: ',
  change: 'Change: '
}




},
function ($exports, $load) {
Object.defineProperty($exports, "i18n", { enumerable: true, get: () => i18n });
Object.defineProperty($exports, "registerLocale", { enumerable: true, get: () => registerLocale });
Object.defineProperty($exports, "getSupportedLocales", { enumerable: true, get: () => getSupportedLocales });
const $mod0 = $load(98);
const zhCN = $mod0.default;
const $mod2 = $load(96);
const enUS = $mod2.default;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */






const locales                          = {
  'zh-CN': zhCN,
  'en-US': enUS
}

function registerLocale (locale        , ls         )       {
  locales[locale] = { ...locales[locale], ...ls }
}

function getSupportedLocales ()           {
  return Object.keys(locales)
}

function i18n (key        , locale        )         {
  return locales[locale]?.[key] ?? key
}




},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => zhCN });

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */



const zhCN          = {
  time: '时间：',
  open: '开：',
  high: '高：',
  low: '低：',
  close: '收：',
  volume: '成交量：',
  turnover: '成交额：',
  change: '涨幅：'
}




},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => averagePrice });
const $mod0 = $load(31);
const IndicatorSeries = $mod0.IndicatorSeries;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */








/**
 * average price
 */
const averagePrice                         = {
  name: 'AVP',
  shortName: 'AVP',
  series: IndicatorSeries.Price,
  precision: 2,
  figures: [
    { key: 'avp', title: 'AVP: ', type: 'line' }
  ],
  calc: (dataList             ) => {
    let totalTurnover = 0
    let totalVolume = 0
    return dataList.map((kLineData           ) => {
      const avp      = {}
      const turnover = kLineData?.turnover ?? 0
      const volume = kLineData?.volume ?? 0
      totalTurnover += turnover
      totalVolume += volume
      if (totalVolume !== 0) {
        avp.avp = totalTurnover / totalVolume
      }
      return avp
    })
  }
}




},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => awesomeOscillator });
const $mod0 = $load(23);
const PolygonType = $mod0.PolygonType;
const $mod2 = $load(81);
const formatValue = $mod2.formatValue;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */











const awesomeOscillator                        = {
  name: 'AO',
  shortName: 'AO',
  calcParams: [5, 34],
  figures: [{
    key: 'ao',
    title: 'AO: ',
    type: 'bar',
    baseValue: 0,
    styles: (data                                       , indicator               , defaultStyles                ) => {
      const { prev, current } = data
      const prevAo = prev.indicatorData?.ao ?? Number.MIN_SAFE_INTEGER
      const currentAo = current.indicatorData?.ao ?? Number.MIN_SAFE_INTEGER
      let color
      if (currentAo > prevAo) {
        color = formatValue(indicator.styles, 'bars[0].upColor', (defaultStyles.bars)[0].upColor)
      } else {
        color = formatValue(indicator.styles, 'bars[0].downColor', (defaultStyles.bars)[0].downColor)
      }
      const style = currentAo > prevAo ? PolygonType.Stroke : PolygonType.Fill
      return { color, style, borderColor: color }
    }
  }],
  calc: (dataList             , indicator               ) => {
    const params = indicator.calcParams
    const maxPeriod = Math.max(params[0]          , params[1]          )
    let shortSum = 0
    let longSum = 0
    let short = 0
    let long = 0
    return dataList.map((kLineData           , i        ) => {
      const ao     = {}
      const middle = (kLineData.low + kLineData.high) / 2
      shortSum += middle
      longSum += middle
      if (i >= params[0] - 1) {
        short = shortSum / params[0]
        const agoKLineData = dataList[i - (params[0] - 1)]
        shortSum -= ((agoKLineData.low + agoKLineData.high) / 2)
      }
      if (i >= params[1] - 1) {
        long = longSum / params[1]
        const agoKLineData = dataList[i - (params[1] - 1)]
        longSum -= ((agoKLineData.low + agoKLineData.high) / 2)
      }
      if (i >= maxPeriod - 1) {
        ao.ao = short - long
      }
      return ao
    })
  }
}




},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => bias });

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */










/**
 * BIAS
 * 乖离率=[(当日收盘价-N日平均价)/N日平均价]*100%
 */
const bias                          = {
  name: 'BIAS',
  shortName: 'BIAS',
  calcParams: [6, 12, 24],
  figures: [
    { key: 'bias1', title: 'BIAS6: ', type: 'line' },
    { key: 'bias2', title: 'BIAS12: ', type: 'line' },
    { key: 'bias3', title: 'BIAS24: ', type: 'line' }
  ],
  regenerateFigures: (params       ) => {
    return params.map((p        , i        ) => {
      return { key: `bias${i + 1}`, title: `BIAS${p}: `, type: 'line' }
    })
  },
  calc: (dataList             , indicator                 ) => {
    const { calcParams: params, figures } = indicator
    const closeSums           = []
    return dataList.map((kLineData           , i        ) => {
      const bias       = {}
      const close = kLineData.close
      params.forEach((p, index) => {
        closeSums[index] = (closeSums[index] ?? 0) + close
        if (i >= p - 1) {
          const mean = closeSums[index] / params[index]
          bias[figures[index].key] = (close - mean) / mean * 100

          closeSums[index] -= dataList[i - (p - 1)].close
        }
      })
      return bias
    })
  }
}




},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => bollingerBands });
const $mod0 = $load(31);
const IndicatorSeries = $mod0.IndicatorSeries;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */










/**
 * 计算布林指标中的标准差
 * @param dataList
 * @param ma
 * @return {number}
 */
function getBollMd (dataList             , ma        )         {
  const dataSize = dataList.length
  let sum = 0
  dataList.forEach(data => {
    const closeMa = data.close - ma
    sum += closeMa * closeMa
  })
  sum = Math.abs(sum)
  return Math.sqrt(sum / dataSize)
}

/**
 * BOLL
 */
const bollingerBands                          = {
  name: 'BOLL',
  shortName: 'BOLL',
  series: IndicatorSeries.Price,
  calcParams: [20, 2],
  precision: 2,
  shouldOhlc: true,
  figures: [
    { key: 'up', title: 'UP: ', type: 'line' },
    { key: 'mid', title: 'MID: ', type: 'line' },
    { key: 'dn', title: 'DN: ', type: 'line' }
  ],
  calc: (dataList             , indicator                 ) => {
    const params = indicator.calcParams
    const p = params[0] - 1
    let closeSum = 0
    return dataList.map((kLineData           , i        ) => {
      const close = kLineData.close
      const boll       = {}
      closeSum += close
      if (i >= p) {
        boll.mid = closeSum / params[0]
        const md = getBollMd(dataList.slice(i - p, i + 1), boll.mid)
        boll.up = boll.mid + params[1] * md
        boll.dn = boll.mid - params[1] * md
        closeSum -= dataList[i - p].close
      }
      return boll
    })
  }
}




},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => brar });

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */









/**
 * BRAR
 * 默认参数是26。
 * 公式N日BR=N日内（H－CY）之和除以N日内（CY－L）之和*100，
 * 其中，H为当日最高价，L为当日最低价，CY为前一交易日的收盘价，N为设定的时间参数。
 * N日AR=(N日内（H－O）之和除以N日内（O－L）之和)*100，
 * 其中，H为当日最高价，L为当日最低价，O为当日开盘价，N为设定的时间参数
 *
 */
const brar                          = {
  name: 'BRAR',
  shortName: 'BRAR',
  calcParams: [26],
  figures: [
    { key: 'br', title: 'BR: ', type: 'line' },
    { key: 'ar', title: 'AR: ', type: 'line' }
  ],
  calc: (dataList             , indicator                 ) => {
    const params = indicator.calcParams
    let hcy = 0
    let cyl = 0
    let ho = 0
    let ol = 0
    return dataList.map((kLineData           , i        ) => {
      const brar       = {}
      const high = kLineData.high
      const low = kLineData.low
      const open = kLineData.open
      const prevClose = (dataList[i - 1] ?? kLineData).close
      ho += (high - open)
      ol += (open - low)
      hcy += (high - prevClose)
      cyl += (prevClose - low)
      if (i >= params[0] - 1) {
        if (ol !== 0) {
          brar.ar = ho / ol * 100
        } else {
          brar.ar = 0
        }
        if (cyl !== 0) {
          brar.br = hcy / cyl * 100
        } else {
          brar.br = 0
        }
        const agoKLineData = dataList[i - (params[0] - 1)]
        const agoHigh = agoKLineData.high
        const agoLow = agoKLineData.low
        const agoOpen = agoKLineData.open
        const agoPreClose = (dataList[i - params[0]] ?? dataList[i - (params[0] - 1)]).close
        hcy -= (agoHigh - agoPreClose)
        cyl -= (agoPreClose - agoLow)
        ho -= (agoHigh - agoOpen)
        ol -= (agoOpen - agoLow)
      }
      return brar
    })
  }
}




},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => bullAndBearIndex });
const $mod0 = $load(31);
const IndicatorSeries = $mod0.IndicatorSeries;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */







/**
 * 多空指标
 * 公式: BBI = (MA(CLOSE, M) + MA(CLOSE, N) + MA(CLOSE, O) + MA(CLOSE, P)) / 4
 *
 */
const bullAndBearIndex                         = {
  name: 'BBI',
  shortName: 'BBI',
  series: IndicatorSeries.Price,
  precision: 2,
  calcParams: [3, 6, 12, 24],
  shouldOhlc: true,
  figures: [
    { key: 'bbi', title: 'BBI: ', type: 'line' }
  ],
  calc: (dataList             , indicator                ) => {
    const params = indicator.calcParams
    const maxPeriod = Math.max(...params)
    const closeSums           = []
    const mas           = []
    return dataList.map((kLineData           , i        ) => {
      const bbi      = {}
      const close = kLineData.close
      params.forEach((p        , index        ) => {
        closeSums[index] = (closeSums[index] ?? 0) + close
        if (i >= p - 1) {
          mas[index] = closeSums[index] / p
          closeSums[index] -= dataList[i - (p - 1)].close
        }
      })
      if (i >= maxPeriod - 1) {
        let maSum = 0
        mas.forEach(ma => {
          maSum += ma
        })
        bbi.bbi = maSum / 4
      }
      return bbi
    })
  }
}




},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => commodityChannelIndex });

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */








/**
 * CCI
 * CCI（N日）=（TP－MA）÷MD÷0.015
 * 其中，TP=（最高价+最低价+收盘价）÷3
 * MA=近N日TP价的累计之和÷N
 * MD=近N日TP - 当前MA绝对值的累计之和÷N
 *
 */
const commodityChannelIndex                         = {
  name: 'CCI',
  shortName: 'CCI',
  calcParams: [20],
  figures: [
    { key: 'cci', title: 'CCI: ', type: 'line' }
  ],
  calc: (dataList             , indicator                ) => {
    const params = indicator.calcParams
    const p = params[0] - 1
    let tpSum = 0
    const tpList           = []
    return dataList.map((kLineData           , i        ) => {
      const cci      = {}
      const tp = (kLineData.high + kLineData.low + kLineData.close) / 3
      tpSum += tp
      tpList.push(tp)
      if (i >= p) {
        const maTp = tpSum / params[0]
        const sliceTpList = tpList.slice(i - p, i + 1)
        let sum = 0
        sliceTpList.forEach(tp => {
          sum += Math.abs(tp - maTp)
        })
        const md = sum / params[0]
        cci.cci = md !== 0 ? (tp - maTp) / md / 0.015 : 0
        const agoTp = (dataList[i - p].high + dataList[i - p].low + dataList[i - p].close) / 3
        tpSum -= agoTp
      }
      return cci
    })
  }
}




},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => currentRatio });

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http:*www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */












/**
 * MID:=REF(HIGH+LOW,1)/2;
 * CR:SUM(MAX(0,HIGH-MID),N)/SUM(MAX(0,MID-LOW),N)*100;
 * MA1:REF(MA(CR,M1),M1/2.5+1);
 * MA2:REF(MA(CR,M2),M2/2.5+1);
 * MA3:REF(MA(CR,M3),M3/2.5+1);
 * MA4:REF(MA(CR,M4),M4/2.5+1);
 * MID赋值:(昨日最高价+昨日最低价)/2
 * 输出带状能量线:0和最高价-MID的较大值的N日累和/0和MID-最低价的较大值的N日累和*100
 * 输出MA1:M1(5)/2.5+1日前的CR的M1(5)日简单移动平均
 * 输出MA2:M2(10)/2.5+1日前的CR的M2(10)日简单移动平均
 * 输出MA3:M3(20)/2.5+1日前的CR的M3(20)日简单移动平均
 * 输出MA4:M4/2.5+1日前的CR的M4日简单移动平均
 *
 */
const currentRatio                        = {
  name: 'CR',
  shortName: 'CR',
  calcParams: [26, 10, 20, 40, 60],
  figures: [
    { key: 'cr', title: 'CR: ', type: 'line' },
    { key: 'ma1', title: 'MA1: ', type: 'line' },
    { key: 'ma2', title: 'MA2: ', type: 'line' },
    { key: 'ma3', title: 'MA3: ', type: 'line' },
    { key: 'ma4', title: 'MA4: ', type: 'line' }
  ],
  calc: (dataList             , indicator               ) => {
    const params = indicator.calcParams

    const ma1ForwardPeriod = Math.ceil(params[1] / 2.5 + 1)
    const ma2ForwardPeriod = Math.ceil(params[2] / 2.5 + 1)
    const ma3ForwardPeriod = Math.ceil(params[3] / 2.5 + 1)
    const ma4ForwardPeriod = Math.ceil(params[4] / 2.5 + 1)
    let ma1Sum = 0
    const ma1List           = []
    let ma2Sum = 0
    const ma2List           = []
    let ma3Sum = 0
    const ma3List           = []
    let ma4Sum = 0
    const ma4List           = []
    const result       = []
    dataList.forEach((kLineData           , i        ) => {
      const cr     = {}
      const prevData = dataList[i - 1] ?? kLineData
      const prevMid = (prevData.high + prevData.close + prevData.low + prevData.open) / 4

      const highSubPreMid = Math.max(0, kLineData.high - prevMid)

      const preMidSubLow = Math.max(0, prevMid - kLineData.low)

      if (i >= params[0] - 1) {
        if (preMidSubLow !== 0) {
          cr.cr = highSubPreMid / preMidSubLow * 100
        } else {
          cr.cr = 0
        }
        ma1Sum += cr.cr
        ma2Sum += cr.cr
        ma3Sum += cr.cr
        ma4Sum += cr.cr
        if (i >= params[0] + params[1] - 2) {
          ma1List.push(ma1Sum / params[1])
          if (i >= params[0] + params[1] + ma1ForwardPeriod - 3) {
            cr.ma1 = ma1List[ma1List.length - 1 - ma1ForwardPeriod]
          }
          ma1Sum -= (result[i - (params[1] - 1)].cr ?? 0)
        }
        if (i >= params[0] + params[2] - 2) {
          ma2List.push(ma2Sum / params[2])
          if (i >= params[0] + params[2] + ma2ForwardPeriod - 3) {
            cr.ma2 = ma2List[ma2List.length - 1 - ma2ForwardPeriod]
          }
          ma2Sum -= (result[i - (params[2] - 1)].cr ?? 0)
        }
        if (i >= params[0] + params[3] - 2) {
          ma3List.push(ma3Sum / params[3])
          if (i >= params[0] + params[3] + ma3ForwardPeriod - 3) {
            cr.ma3 = ma3List[ma3List.length - 1 - ma3ForwardPeriod]
          }
          ma3Sum -= (result[i - (params[3] - 1)].cr ?? 0)
        }
        if (i >= params[0] + params[4] - 2) {
          ma4List.push(ma4Sum / params[4])
          if (i >= params[0] + params[4] + ma4ForwardPeriod - 3) {
            cr.ma4 = ma4List[ma4List.length - 1 - ma4ForwardPeriod]
          }
          ma4Sum -= (result[i - (params[4] - 1)].cr ?? 0)
        }
      }
      result.push(cr)
    })
    return result
  }
}



},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => differentOfMovingAverage });

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */









/**
 * DMA
 * 公式：DIF:MA(CLOSE,N1)-MA(CLOSE,N2);DIFMA:MA(DIF,M)
 */
const differentOfMovingAverage                         = {
  name: 'DMA',
  shortName: 'DMA',
  calcParams: [10, 50, 10],
  figures: [
    { key: 'dma', title: 'DMA: ', type: 'line' },
    { key: 'ama', title: 'AMA: ', type: 'line' }
  ],
  calc: (dataList             , indicator                ) => {
    const params = indicator.calcParams
    const maxPeriod = Math.max(params[0], params[1])
    let closeSum1 = 0
    let closeSum2 = 0
    let dmaSum = 0
    const result        = []
    dataList.forEach((kLineData           , i        ) => {
      const dma      = {}
      const close = kLineData.close
      closeSum1 += close
      closeSum2 += close
      let ma1 = 0
      let ma2 = 0
      if (i >= params[0] - 1) {
        ma1 = closeSum1 / params[0]
        closeSum1 -= dataList[i - (params[0] - 1)].close
      }
      if (i >= params[1] - 1) {
        ma2 = closeSum2 / params[1]
        closeSum2 -= dataList[i - (params[1] - 1)].close
      }

      if (i >= maxPeriod - 1) {
        const dif = ma1 - ma2
        dma.dma = dif
        dmaSum += dif
        if (i >= maxPeriod + params[2] - 2) {
          dma.ama = dmaSum / params[2]
          dmaSum -= (result[i - (params[2] - 1)].dma ?? 0)
        }
      }
      result.push(dma)
    })
    return result
  }
}




},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => directionalMovementIndex });

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */











/**
 * DMI
 *
 * MTR:=EXPMEMA(MAX(MAX(HIGH-LOW,ABS(HIGH-REF(CLOSE,1))),ABS(REF(CLOSE,1)-LOW)),N)
 * HD :=HIGH-REF(HIGH,1);
 * LD :=REF(LOW,1)-LOW;
 * DMP:=EXPMEMA(IF(HD>0&&HD>LD,HD,0),N);
 * DMM:=EXPMEMA(IF(LD>0&&LD>HD,LD,0),N);
 *
 * PDI: DMP*100/MTR;
 * MDI: DMM*100/MTR;
 * ADX: EXPMEMA(ABS(MDI-PDI)/(MDI+PDI)*100,MM);
 * ADXR:EXPMEMA(ADX,MM);
 * 公式含义：
 * MTR赋值:最高价-最低价和最高价-昨收的绝对值的较大值和昨收-最低价的绝对值的较大值的N日指数平滑移动平均
 * HD赋值:最高价-昨日最高价
 * LD赋值:昨日最低价-最低价
 * DMP赋值:如果HD>0并且HD>LD,返回HD,否则返回0的N日指数平滑移动平均
 * DMM赋值:如果LD>0并且LD>HD,返回LD,否则返回0的N日指数平滑移动平均
 * 输出PDI:DMP*100/MTR
 * 输出MDI:DMM*100/MTR
 * 输出ADX:MDI-PDI的绝对值/(MDI+PDI)*100的MM日指数平滑移动平均
 * 输出ADXR:ADX的MM日指数平滑移动平均
 *
 */
const directionalMovementIndex                         = {
  name: 'DMI',
  shortName: 'DMI',
  calcParams: [14, 6],
  figures: [
    { key: 'pdi', title: 'PDI: ', type: 'line' },
    { key: 'mdi', title: 'MDI: ', type: 'line' },
    { key: 'adx', title: 'ADX: ', type: 'line' },
    { key: 'adxr', title: 'ADXR: ', type: 'line' }
  ],
  calc: (dataList             , indicator                ) => {
    const params = indicator.calcParams
    let trSum = 0
    let hSum = 0
    let lSum = 0
    let mtr = 0
    let dmp = 0
    let dmm = 0
    let dxSum = 0
    let adx = 0
    const result        = []
    dataList.forEach((kLineData           , i        ) => {
      const dmi      = {}
      const prevKLineData = dataList[i - 1] ?? kLineData
      const preClose = prevKLineData.close
      const high = kLineData.high
      const low = kLineData.low
      const hl = high - low
      const hcy = Math.abs(high - preClose)
      const lcy = Math.abs(preClose - low)
      const hhy = high - prevKLineData.high
      const lyl = prevKLineData.low - low
      const tr = Math.max(Math.max(hl, hcy), lcy)
      const h = (hhy > 0 && hhy > lyl) ? hhy : 0
      const l = (lyl > 0 && lyl > hhy) ? lyl : 0
      trSum += tr
      hSum += h
      lSum += l
      if (i >= params[0] - 1) {
        if (i > params[0] - 1) {
          mtr = mtr - mtr / params[0] + tr
          dmp = dmp - dmp / params[0] + h
          dmm = dmm - dmm / params[0] + l
        } else {
          mtr = trSum
          dmp = hSum
          dmm = lSum
        }
        let pdi = 0
        let mdi = 0
        if (mtr !== 0) {
          pdi = dmp * 100 / mtr
          mdi = dmm * 100 / mtr
        }
        dmi.pdi = pdi
        dmi.mdi = mdi
        let dx = 0
        if (mdi + pdi !== 0) {
          dx = Math.abs((mdi - pdi)) / (mdi + pdi) * 100
        }
        dxSum += dx
        if (i >= params[0] * 2 - 2) {
          if (i > params[0] * 2 - 2) {
            adx = (adx * (params[0] - 1) + dx) / params[0]
          } else {
            adx = dxSum / params[0]
          }
          dmi.adx = adx
          if (i >= params[0] * 2 + params[1] - 3) {
            dmi.adxr = ((result[i - (params[1] - 1)].adx ?? 0) + adx) / 2
          }
        }
      }
      result.push(dmi)
    })
    return result
  }
}




},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => easeOfMovementValue });

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */









/**
 *
 * EMV 简易波动指标
 * 公式：
 * A=（今日最高+今日最低）/2
 * B=（前日最高+前日最低）/2
 * C=今日最高-今日最低
 * EM=（A-B）*C/今日成交额
 * EMV=N日内EM的累和
 * MAEMV=EMV的M日的简单移动平均
 *
 */
const easeOfMovementValue                         = {
  name: 'EMV',
  shortName: 'EMV',
  calcParams: [14, 9],
  figures: [
    { key: 'emv', title: 'EMV: ', type: 'line' },
    { key: 'maEmv', title: 'MAEMV: ', type: 'line' }
  ],
  calc: (dataList             , indicator                ) => {
    const params = indicator.calcParams
    let emvValueSum = 0
    const emvValueList           = []
    return dataList.map((kLineData           , i        ) => {
      const emv      = {}
      if (i > 0) {
        const prevKLineData = dataList[i - 1]
        const high = kLineData.high
        const low = kLineData.low
        const volume = kLineData.volume ?? 0
        const distanceMoved = (high + low) / 2 - (prevKLineData.high + prevKLineData.low) / 2

        if (volume === 0 || high - low === 0) {
          emv.emv = 0
        } else {
          const ratio = volume / 100000000 / (high - low)
          emv.emv = distanceMoved / ratio
        }
        emvValueSum += emv.emv
        emvValueList.push(emv.emv)
        if (i >= params[0]) {
          emv.maEmv = emvValueSum / params[0]
          emvValueSum -= emvValueList[i - params[0]]
        }
      }
      return emv
    })
  }
}




},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => exponentialMovingAverage });
const $mod0 = $load(31);
const IndicatorSeries = $mod0.IndicatorSeries;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */










/**
 * EMA 指数移动平均
 */
const exponentialMovingAverage                         = {
  name: 'EMA',
  shortName: 'EMA',
  series: IndicatorSeries.Price,
  calcParams: [6, 12, 20],
  precision: 2,
  shouldOhlc: true,
  figures: [
    { key: 'ema1', title: 'EMA6: ', type: 'line' },
    { key: 'ema2', title: 'EMA12: ', type: 'line' },
    { key: 'ema3', title: 'EMA20: ', type: 'line' }
  ],
  regenerateFigures: (params       ) => {
    return params.map((p        , i        ) => {
      return { key: `ema${i + 1}`, title: `EMA${p}: `, type: 'line' }
    })
  },
  calc: (dataList             , indicator                ) => {
    const { calcParams: params, figures } = indicator
    let closeSum = 0
    const emaValues           = []
    return dataList.map((kLineData           , i        ) => {
      const ema = {}
      const close = kLineData.close
      closeSum += close
      params.forEach((p        , index        ) => {
        if (i >= p - 1) {
          if (i > p - 1) {
            emaValues[index] = (2 * close + (p - 1) * emaValues[index]) / (p + 1)
          } else {
            emaValues[index] = closeSum / p
          }
          ema[figures[index].key] = emaValues[index]
        }
      })
      return ema
    })
  }
}




},
function ($exports, $load) {
Object.defineProperty($exports, "registerIndicator", { enumerable: true, get: () => registerIndicator });
Object.defineProperty($exports, "getIndicatorClass", { enumerable: true, get: () => getIndicatorClass });
Object.defineProperty($exports, "getSupportedIndicators", { enumerable: true, get: () => getSupportedIndicators });
const $mod0 = $load(31);
const IndicatorImp = $mod0.default;
const $mod2 = $load(99);
const averagePrice = $mod2.default;
const $mod4 = $load(100);
const awesomeOscillator = $mod4.default;
const $mod6 = $load(101);
const bias = $mod6.default;
const $mod8 = $load(102);
const bollingerBands = $mod8.default;
const $mod10 = $load(103);
const brar = $mod10.default;
const $mod12 = $load(104);
const bullAndBearIndex = $mod12.default;
const $mod14 = $load(105);
const commodityChannelIndex = $mod14.default;
const $mod16 = $load(106);
const currentRatio = $mod16.default;
const $mod18 = $load(107);
const differentOfMovingAverage = $mod18.default;
const $mod20 = $load(108);
const directionalMovementIndex = $mod20.default;
const $mod22 = $load(109);
const easeOfMovementValue = $mod22.default;
const $mod24 = $load(110);
const exponentialMovingAverage = $mod24.default;
const $mod26 = $load(112);
const momentum = $mod26.default;
const $mod28 = $load(113);
const movingAverage = $mod28.default;
const $mod30 = $load(114);
const movingAverageConvergenceDivergence = $mod30.default;
const $mod32 = $load(115);
const onBalanceVolume = $mod32.default;
const $mod34 = $load(116);
const priceAndVolumeTrend = $mod34.default;
const $mod36 = $load(117);
const psychologicalLine = $mod36.default;
const $mod38 = $load(118);
const rateOfChange = $mod38.default;
const $mod40 = $load(119);
const relativeStrengthIndex = $mod40.default;
const $mod42 = $load(120);
const simpleMovingAverage = $mod42.default;
const $mod44 = $load(121);
const stoch = $mod44.default;
const $mod46 = $load(122);
const stopAndReverse = $mod46.default;
const $mod48 = $load(123);
const tripleExponentiallySmoothedAverage = $mod48.default;
const $mod50 = $load(124);
const volume = $mod50.default;
const $mod52 = $load(125);
const volumeRatio = $mod52.default;
const $mod54 = $load(126);
const williamsR = $mod54.default;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

































const indicators                                       = {}

const extensions = [
  averagePrice, awesomeOscillator, bias, bollingerBands, brar,
  bullAndBearIndex, commodityChannelIndex, currentRatio, differentOfMovingAverage,
  directionalMovementIndex, easeOfMovementValue, exponentialMovingAverage, momentum,
  movingAverage, movingAverageConvergenceDivergence, onBalanceVolume, priceAndVolumeTrend,
  psychologicalLine, rateOfChange, relativeStrengthIndex, simpleMovingAverage,
  stoch, stopAndReverse, tripleExponentiallySmoothedAverage, volume, volumeRatio, williamsR
]

extensions.forEach((indicator                   ) => {
  indicators[indicator.name] = IndicatorImp.extend(indicator)
})

function registerIndicator    (indicator                      )       {
  indicators[indicator.name] = IndicatorImp.extend(indicator)
}

function getIndicatorClass (name        )                                 {
  return indicators[name] ?? null
}

function getSupportedIndicators ()           {
  return Object.keys(indicators)
}




},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => momentum });

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */









/**
 * mtm
 * 公式 MTM（N日）=C－CN
 */
const momentum                         = {
  name: 'MTM',
  shortName: 'MTM',
  calcParams: [12, 6],
  figures: [
    { key: 'mtm', title: 'MTM: ', type: 'line' },
    { key: 'maMtm', title: 'MAMTM: ', type: 'line' }
  ],
  calc: (dataList             , indicator                ) => {
    const params = indicator.calcParams
    let mtmSum = 0
    const result        = []
    dataList.forEach((kLineData           , i        ) => {
      const mtm      = {}
      if (i >= params[0]) {
        const close = kLineData.close
        const agoClose = dataList[i - params[0]].close
        mtm.mtm = close - agoClose
        mtmSum += mtm.mtm
        if (i >= params[0] + params[1] - 1) {
          mtm.maMtm = mtmSum / params[1]
          mtmSum -= (result[i - (params[1] - 1)].mtm ?? 0)
        }
      }
      result.push(mtm)
    })
    return result
  }
}




},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => movingAverage });
const $mod0 = $load(31);
const IndicatorSeries = $mod0.IndicatorSeries;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */











/**
 * MA 移动平均
 */
const movingAverage                        = {
  name: 'MA',
  shortName: 'MA',
  series: IndicatorSeries.Price,
  calcParams: [5, 10, 30, 60],
  precision: 2,
  shouldOhlc: true,
  figures: [
    { key: 'ma5', title: 'MA5: ', type: 'line' },
    { key: 'ma10', title: 'MA10: ', type: 'line' },
    { key: 'ma30', title: 'MA30: ', type: 'line' },
    { key: 'ma60', title: 'MA60: ', type: 'line' }
  ],
  regenerateFigures: (params       ) => {
    return params.map((p        , i        ) => {
      return { key: `ma${i + 1}`, title: `MA${p}: `, type: 'line' }
    })
  },
  calc: (dataList             , indicator               ) => {
    const { calcParams: params, figures } = indicator
    const closeSums           = []
    return dataList.map((kLineData           , i        ) => {
      const ma = {}
      const close = kLineData.close
      params.forEach((p        , index        ) => {
        closeSums[index] = (closeSums[index] ?? 0) + close
        if (i >= p - 1) {
          ma[figures[index].key] = closeSums[index] / p
          closeSums[index] -= dataList[i - (p - 1)].close
        }
      })
      return ma
    })
  }
}




},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => movingAverageConvergenceDivergence });
const $mod0 = $load(23);
const PolygonType = $mod0.PolygonType;
const $mod2 = $load(81);
const formatValue = $mod2.formatValue;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */














/**
 * MACD：参数快线移动平均、慢线移动平均、移动平均，
 * 默认参数值12、26、9。
 * 公式：⒈首先分别计算出收盘价12日指数平滑移动平均线与26日指数平滑移动平均线，分别记为EMA(12）与EMA(26）。
 * ⒉求这两条指数平滑移动平均线的差，即：DIFF = EMA(SHORT) － EMA(LONG)。
 * ⒊再计算DIFF的M日的平均的指数平滑移动平均线，记为DEA。
 * ⒋最后用DIFF减DEA，得MACD。MACD通常绘制成围绕零轴线波动的柱形图。MACD柱状大于0涨颜色，小于0跌颜色。
 */
const movingAverageConvergenceDivergence                          = {
  name: 'MACD',
  shortName: 'MACD',
  calcParams: [12, 26, 9],
  figures: [
    { key: 'dif', title: 'DIF: ', type: 'line' },
    { key: 'dea', title: 'DEA: ', type: 'line' },
    {
      key: 'macd',
      title: 'MACD: ',
      type: 'bar',
      baseValue: 0,
      styles: (data                                         , indicator           , defaultStyles                ) => {
        const { prev, current } = data
        const prevMacd = prev.indicatorData?.macd ?? Number.MIN_SAFE_INTEGER
        const currentMacd = current.indicatorData?.macd ?? Number.MIN_SAFE_INTEGER
        let color
        if (currentMacd > 0) {
          color = formatValue(indicator.styles, 'bars[0].upColor', (defaultStyles.bars)[0].upColor)
        } else if (currentMacd < 0) {
          color = formatValue(indicator.styles, 'bars[0].downColor', (defaultStyles.bars)[0].downColor)
        } else {
          color = formatValue(indicator.styles, 'bars[0].noChangeColor', (defaultStyles.bars)[0].noChangeColor)
        }
        const style = prevMacd < currentMacd ? PolygonType.Stroke : PolygonType.Fill
        return { style, color, borderColor: color }
      }
    }
  ],
  calc: (dataList             , indicator                 ) => {
    const params = indicator.calcParams
    let closeSum = 0
    let emaShort
    let emaLong
    let dif = 0
    let difSum = 0
    let dea = 0
    const maxPeriod = Math.max(params[0], params[1])
    return dataList.map((kLineData           , i        ) => {
      const macd       = {}
      const close = kLineData.close
      closeSum += close
      if (i >= params[0] - 1) {
        if (i > params[0] - 1) {
          emaShort = (2 * close + (params[0] - 1) * emaShort) / (params[0] + 1)
        } else {
          emaShort = closeSum / params[0]
        }
      }
      if (i >= params[1] - 1) {
        if (i > params[1] - 1) {
          emaLong = (2 * close + (params[1] - 1) * emaLong) / (params[1] + 1)
        } else {
          emaLong = closeSum / params[1]
        }
      }
      if (i >= maxPeriod - 1) {
        dif = emaShort - emaLong
        macd.dif = dif
        difSum += dif
        if (i >= maxPeriod + params[2] - 2) {
          if (i > maxPeriod + params[2] - 2) {
            dea = (dif * 2 + dea * (params[2] - 1)) / (params[2] + 1)
          } else {
            dea = difSum / params[2]
          }
          macd.macd = (dif - dea) * 2
          macd.dea = dea
        }
      }
      return macd
    })
  }
}




},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => onBalanceVolume });

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */









/**
 * OBV
 * OBV = REF(OBV) + sign * V
 */
const onBalanceVolume                         = {
  name: 'OBV',
  shortName: 'OBV',
  calcParams: [30],
  figures: [
    { key: 'obv', title: 'OBV: ', type: 'line' },
    { key: 'maObv', title: 'MAOBV: ', type: 'line' }
  ],
  calc: (dataList             , indicator                ) => {
    const params = indicator.calcParams
    let obvSum = 0
    let oldObv = 0
    const result        = []
    dataList.forEach((kLineData           , i        ) => {
      const prevKLineData = dataList[i - 1] ?? kLineData
      if (kLineData.close < prevKLineData.close) {
        oldObv -= (kLineData.volume ?? 0)
      } else if (kLineData.close > prevKLineData.close) {
        oldObv += (kLineData.volume ?? 0)
      }
      const obv      = { obv: oldObv }
      obvSum += oldObv
      if (i >= params[0] - 1) {
        obv.maObv = obvSum / params[0]
        obvSum -= (result[i - (params[0] - 1)].obv ?? 0)
      }
      result.push(obv)
    })
    return result
  }
}




},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => priceAndVolumeTrend });

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */








/**
 * 价量趋势指标
 * 公式:
 * X = (CLOSE - REF(CLOSE, 1)) / REF(CLOSE, 1) * VOLUME
 * PVT = SUM(X)
 *
 */
const priceAndVolumeTrend                         = {
  name: 'PVT',
  shortName: 'PVT',
  figures: [
    { key: 'pvt', title: 'PVT: ', type: 'line' }
  ],
  calc: (dataList             ) => {
    let sum = 0
    return dataList.map((kLineData, i) => {
      const pvt      = {}
      const close = kLineData.close
      const volume = kLineData.volume ?? 1
      const prevClose = (dataList[i - 1] ?? kLineData).close
      let x = 0
      const total = prevClose * volume
      if (total !== 0) {
        x = (close - prevClose) / total
      }
      sum += x
      pvt.pvt = sum
      return pvt
    })
  }
}




},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => psychologicalLine });

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */









/**
 * PSY
 * 公式：PSY=N日内的上涨天数/N×100%。
 */
const psychologicalLine                         = {
  name: 'PSY',
  shortName: 'PSY',
  calcParams: [12, 6],
  figures: [
    { key: 'psy', title: 'PSY: ', type: 'line' },
    { key: 'maPsy', title: 'MAPSY: ', type: 'line' }
  ],
  calc: (dataList             , indicator                ) => {
    const params = indicator.calcParams
    let upCount = 0
    let psySum = 0
    const upList           = []
    const result        = []
    dataList.forEach((kLineData           , i        ) => {
      const psy      = {}
      const prevClose = (dataList[i - 1] ?? kLineData).close
      const upFlag = kLineData.close - prevClose > 0 ? 1 : 0
      upList.push(upFlag)
      upCount += upFlag
      if (i >= params[0] - 1) {
        psy.psy = upCount / params[0] * 100
        psySum += psy.psy
        if (i >= params[0] + params[1] - 2) {
          psy.maPsy = psySum / params[1]
          psySum -= (result[i - (params[1] - 1)].psy ?? 0)
        }
        upCount -= upList[i - (params[0] - 1)]
      }
      result.push(psy)
    })
    return result
  }
}




},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => rateOfChange });

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */









/**
 * 变动率指标
 * 公式：ROC = (CLOSE - REF(CLOSE, N)) / REF(CLOSE, N)
 */
const rateOfChange                         = {
  name: 'ROC',
  shortName: 'ROC',
  calcParams: [12, 6],
  figures: [
    { key: 'roc', title: 'ROC: ', type: 'line' },
    { key: 'maRoc', title: 'MAROC: ', type: 'line' }
  ],
  calc: (dataList             , indicator                ) => {
    const params = indicator.calcParams
    const result        = []
    let rocSum = 0
    dataList.forEach((kLineData           , i        ) => {
      const roc      = {}
      if (i >= params[0] - 1) {
        const close = kLineData.close
        const agoClose = (dataList[i - params[0]] ?? dataList[i - (params[0] - 1)]).close
        if (agoClose !== 0) {
          roc.roc = (close - agoClose) / agoClose * 100
        } else {
          roc.roc = 0
        }
        rocSum += roc.roc
        if (i >= params[0] - 1 + params[1] - 1) {
          roc.maRoc = rocSum / params[1]
          rocSum -= (result[i - (params[1] - 1)].roc ?? 0)
        }
      }
      result.push(roc)
    })
    return result
  }
}




},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => relativeStrengthIndex });

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */










/**
 * RSI
 * RSI = SUM(MAX(CLOSE - REF(CLOSE,1),0),N) / SUM(ABS(CLOSE - REF(CLOSE,1)),N) × 100
 */
const relativeStrengthIndex                         = {
  name: 'RSI',
  shortName: 'RSI',
  calcParams: [6, 12, 24],
  figures: [
    { key: 'rsi1', title: 'RSI1: ', type: 'line' },
    { key: 'rsi2', title: 'RSI2: ', type: 'line' },
    { key: 'rsi3', title: 'RSI3: ', type: 'line' }
  ],
  regenerateFigures: (params       ) => {
    return params.map((_     , index        ) => {
      const num = index + 1
      return { key: `rsi${num}`, title: `RSI${num}: `, type: 'line' }
    })
  },
  calc: (dataList             , indicator                ) => {
    const { calcParams: params, figures } = indicator
    const sumCloseAs           = []
    const sumCloseBs           = []
    return dataList.map((kLineData, i) => {
      const rsi = {}
      const prevClose = (dataList[i - 1] ?? kLineData).close
      const tmp = kLineData.close - prevClose
      params.forEach((p, index) => {
        if (tmp > 0) {
          sumCloseAs[index] = (sumCloseAs[index] ?? 0) + tmp
        } else {
          sumCloseBs[index] = (sumCloseBs[index] ?? 0) + Math.abs(tmp)
        }
        if (i >= p - 1) {
          if (sumCloseBs[index] !== 0) {
            rsi[figures[index].key] = 100 - (100.0 / (1 + sumCloseAs[index] / sumCloseBs[index]))
          } else {
            rsi[figures[index].key] = 0
          }
          const agoData = dataList[i - (p - 1)]
          const agoPreData = dataList[i - p] ?? agoData
          const agoTmp = agoData.close - agoPreData.close
          if (agoTmp > 0) {
            sumCloseAs[index] -= agoTmp
          } else {
            sumCloseBs[index] -= Math.abs(agoTmp)
          }
        }
      })
      return rsi
    })
  }
}




},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => simpleMovingAverage });
const $mod0 = $load(31);
const IndicatorSeries = $mod0.IndicatorSeries;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */








/**
 * sma
 */
const simpleMovingAverage                         = {
  name: 'SMA',
  shortName: 'SMA',
  series: IndicatorSeries.Price,
  calcParams: [12, 2],
  precision: 2,
  figures: [
    { key: 'sma', title: 'SMA: ', type: 'line' }
  ],
  shouldOhlc: true,
  calc: (dataList             , indicator                ) => {
    const params = indicator.calcParams
    let closeSum = 0
    let smaValue = 0
    return dataList.map((kLineData           , i        ) => {
      const sma      = {}
      const close = kLineData.close
      closeSum += close
      if (i >= params[0] - 1) {
        if (i > params[0] - 1) {
          smaValue = (close * params[1] + smaValue * (params[0] - params[1] + 1)) / (params[0] + 1)
        } else {
          smaValue = closeSum / params[0]
        }
        sma.sma = smaValue
      }
      return sma
    })
  }
}




},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => stoch });
const $mod0 = $load(84);
const getMaxMin = $mod0.getMaxMin;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */












/**
 * KDJ
 *
 * 当日K值=2/3×前一日K值+1/3×当日RSV
 * 当日D值=2/3×前一日D值+1/3×当日K值
 * 若无前一日K 值与D值，则可分别用50来代替。
 * J值=3*当日K值-2*当日D值
 */
const stoch                         = {
  name: 'KDJ',
  shortName: 'KDJ',
  calcParams: [9, 3, 3],
  figures: [
    { key: 'k', title: 'K: ', type: 'line' },
    { key: 'd', title: 'D: ', type: 'line' },
    { key: 'j', title: 'J: ', type: 'line' }
  ],
  calc: (dataList             , indicator                ) => {
    const params = indicator.calcParams
    const result        = []
    dataList.forEach((kLineData           , i        ) => {
      const kdj      = {}
      const close = kLineData.close
      if (i >= params[0] - 1) {
        const lhn = getMaxMin           (dataList.slice(i - (params[0] - 1), i + 1), 'high', 'low')
        const hn = lhn[0]
        const ln = lhn[1]
        const hnSubLn = hn - ln
        const rsv = (close - ln) / (hnSubLn === 0 ? 1 : hnSubLn) * 100
        kdj.k = ((params[1] - 1) * (result[i - 1]?.k ?? 50) + rsv) / params[1]
        kdj.d = ((params[2] - 1) * (result[i - 1]?.d ?? 50) + kdj.k) / params[2]
        kdj.j = 3.0 * kdj.k - 2.0 * kdj.d
      }
      result.push(kdj)
    })
    return result
  }
}




},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => stopAndReverse });
const $mod0 = $load(81);
const formatValue = $mod0.formatValue;
const $mod2 = $load(31);
const IndicatorSeries = $mod2.IndicatorSeries;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */











const stopAndReverse                         = {
  name: 'SAR',
  shortName: 'SAR',
  series: IndicatorSeries.Price,
  calcParams: [2, 2, 20],
  precision: 2,
  shouldOhlc: true,
  figures: [
    {
      key: 'sar',
      title: 'SAR: ',
      type: 'circle',
      styles: (data                                        , indicator           , defaultStyles                ) => {
        const { current } = data
        const sar = current.indicatorData?.sar ?? Number.MIN_SAFE_INTEGER
        const kLineData = current.kLineData
        const halfHL = (kLineData?.high + kLineData?.low) / 2
        const color = sar < halfHL
          ? formatValue(indicator.styles, 'circles[0].upColor', (defaultStyles.circles)[0].upColor)
          : formatValue(indicator.styles, 'circles[0].downColor', (defaultStyles.circles)[0].downColor)
        return { color }
      }
    }
  ],
  calc: (dataList             , indicator                ) => {
    const params = indicator.calcParams
    const startAf = params[0] / 100
    const step = params[1] / 100
    const maxAf = params[2] / 100

    // 加速因子
    let af = startAf
    // 极值
    let ep = -100
    // 判断是上涨还是下跌  false：下跌
    let isIncreasing = false
    let sar = 0
    return dataList.map((kLineData           , i        ) => {
      // 上一个周期的sar
      const preSar = sar
      const high = kLineData.high
      const low = kLineData.low
      if (isIncreasing) {
        // 上涨
        if (ep === -100 || ep < high) {
          // 重新初始化值
          ep = high
          af = Math.min(af + step, maxAf)
        }
        sar = preSar + af * (ep - preSar)
        const lowMin = Math.min(dataList[Math.max(1, i) - 1].low, low)
        if (sar > kLineData.low) {
          sar = ep
          // 重新初始化值
          af = startAf
          ep = -100
          isIncreasing = !isIncreasing
        } else if (sar > lowMin) {
          sar = lowMin
        }
      } else {
        if (ep === -100 || ep > low) {
          // 重新初始化值
          ep = low
          af = Math.min(af + step, maxAf)
        }
        sar = preSar + af * (ep - preSar)
        const highMax = Math.max(dataList[Math.max(1, i) - 1].high, high)
        if (sar < kLineData.high) {
          sar = ep
          // 重新初始化值
          af = 0
          ep = -100
          isIncreasing = !isIncreasing
        } else if (sar < highMax) {
          sar = highMax
        }
      }
      return { sar }
    })
  }
}




},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => tripleExponentiallySmoothedAverage });

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http:*www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */









/**
 * trix
 *
 * TR=收盘价的N日指数移动平均的N日指数移动平均的N日指数移动平均；
 * TRIX=(TR-昨日TR)/昨日TR*100；
 * MATRIX=TRIX的M日简单移动平均；
 * 默认参数N设为12，默认参数M设为9；
 * 默认参数12、9
 * 公式：MTR:=EMA(EMA(EMA(CLOSE,N),N),N)
 * TRIX:(MTR-REF(MTR,1))/REF(MTR,1)*100;
 * TRMA:MA(TRIX,M)
 *
 */
const tripleExponentiallySmoothedAverage                          = {
  name: 'TRIX',
  shortName: 'TRIX',
  calcParams: [12, 9],
  figures: [
    { key: 'trix', title: 'TRIX: ', type: 'line' },
    { key: 'maTrix', title: 'MATRIX: ', type: 'line' }
  ],
  calc: (dataList             , indicator                 ) => {
    const params = indicator.calcParams
    let closeSum = 0
    let ema1
    let ema2
    let oldTr
    let ema1Sum = 0
    let ema2Sum = 0
    let trixSum = 0
    const result         = []
    dataList.forEach((kLineData           , i        ) => {
      const trix       = {}
      const close = kLineData.close
      closeSum += close
      if (i >= params[0] - 1) {
        if (i > params[0] - 1) {
          ema1 = (2 * close + (params[0] - 1) * ema1) / (params[0] + 1)
        } else {
          ema1 = closeSum / params[0]
        }
        ema1Sum += ema1
        if (i >= params[0] * 2 - 2) {
          if (i > params[0] * 2 - 2) {
            ema2 = (2 * ema1 + (params[0] - 1) * ema2) / (params[0] + 1)
          } else {
            ema2 = ema1Sum / params[0]
          }
          ema2Sum += ema2
          if (i >= params[0] * 3 - 3) {
            let tr
            let trixValue = 0
            if (i > params[0] * 3 - 3) {
              tr = (2 * ema2 + (params[0] - 1) * oldTr) / (params[0] + 1)
              trixValue = (tr - oldTr) / oldTr * 100
            } else {
              tr = ema2Sum / params[0]
            }
            oldTr = tr
            trix.trix = trixValue
            trixSum += trixValue
            if (i >= params[0] * 3 + params[1] - 4) {
              trix.maTrix = trixSum / params[1]
              trixSum -= (result[i - (params[1] - 1)].trix ?? 0)
            }
          }
        }
      }
      result.push(trix)
    })
    return result
  }
}




},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => volume });
const $mod0 = $load(81);
const formatValue = $mod0.formatValue;
const $mod2 = $load(87);
const isValid = $mod2.isValid;
const $mod4 = $load(31);
const IndicatorSeries = $mod4.IndicatorSeries;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */















function getVolumeFigure ()                       {
  return {
    key: 'volume',
    title: 'VOLUME: ',
    type: 'bar',
    baseValue: 0,
    styles: (data                                        , indicator           , defaultStyles                ) => {
      const kLineData = data.current.kLineData
      let color = formatValue(indicator.styles, 'bars[0].noChangeColor', (defaultStyles.bars)[0].noChangeColor)
      if (isValid(kLineData)) {
        if (kLineData.close > kLineData.open) {
          color = formatValue(indicator.styles, 'bars[0].upColor', (defaultStyles.bars)[0].upColor)
        } else if (kLineData.close < kLineData.open) {
          color = formatValue(indicator.styles, 'bars[0].downColor', (defaultStyles.bars)[0].downColor)
        }
      }
      return { color: color           }
    }
  }
}

const volume                         = {
  name: 'VOL',
  shortName: 'VOL',
  series: IndicatorSeries.Volume,
  calcParams: [5, 10, 20],
  shouldFormatBigNumber: true,
  precision: 0,
  minValue: 0,
  figures: [
    { key: 'ma1', title: 'MA5: ', type: 'line' },
    { key: 'ma2', title: 'MA10: ', type: 'line' },
    { key: 'ma3', title: 'MA20: ', type: 'line' },
    getVolumeFigure()
  ],
  regenerateFigures: (params       ) => {
    const figures                              = params.map((p        , i        ) => {
      return { key: `ma${i + 1}`, title: `MA${p}: `, type: 'line' }
    })
    figures.push(getVolumeFigure())
    return figures
  },
  calc: (dataList             , indicator                ) => {
    const { calcParams: params, figures } = indicator
    const volSums           = []
    return dataList.map((kLineData           , i        ) => {
      const volume = kLineData.volume ?? 0
      const vol      = { volume }
      params.forEach((p, index) => {
        volSums[index] = (volSums[index] ?? 0) + volume
        if (i >= p - 1) {
          vol[figures[index].key] = volSums[index] / p
          volSums[index] -= (dataList[i - (p - 1)].volume ?? 0)
        }
      })
      return vol
    })
  }
}




},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => volumeRatio });

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */









/**
 * VR
 * VR=（UVS+1/2PVS）/（DVS+1/2PVS）
 * 24天以来凡是股价上涨那一天的成交量都称为AV，将24天内的AV总和相加后称为UVS
 * 24天以来凡是股价下跌那一天的成交量都称为BV，将24天内的BV总和相加后称为DVS
 * 24天以来凡是股价不涨不跌，则那一天的成交量都称为CV，将24天内的CV总和相加后称为PVS
 *
 */
const volumeRatio                        = {
  name: 'VR',
  shortName: 'VR',
  calcParams: [26, 6],
  figures: [
    { key: 'vr', title: 'VR: ', type: 'line' },
    { key: 'maVr', title: 'MAVR: ', type: 'line' }
  ],
  calc: (dataList             , indicator               ) => {
    const params = indicator.calcParams
    let uvs = 0
    let dvs = 0
    let pvs = 0
    let vrSum = 0
    const result       = []
    dataList.forEach((kLineData           , i        ) => {
      const vr     = {}
      const close = kLineData.close
      const preClose = (dataList[i - 1] ?? kLineData).close
      const volume = kLineData.volume ?? 0
      if (close > preClose) {
        uvs += volume
      } else if (close < preClose) {
        dvs += volume
      } else {
        pvs += volume
      }
      if (i >= params[0] - 1) {
        const halfPvs = pvs / 2
        if (dvs + halfPvs === 0) {
          vr.vr = 0
        } else {
          vr.vr = (uvs + halfPvs) / (dvs + halfPvs) * 100
        }
        vrSum += vr.vr
        if (i >= params[0] + params[1] - 2) {
          vr.maVr = vrSum / params[1]
          vrSum -= (result[i - (params[1] - 1)].vr ?? 0)
        }

        const agoData = dataList[i - (params[0] - 1)]
        const agoPreData = dataList[i - params[0]] ?? agoData
        const agoClose = agoData.close
        const agoVolume = agoData.volume ?? 0
        if (agoClose > agoPreData.close) {
          uvs -= agoVolume
        } else if (agoClose < agoPreData.close) {
          dvs -= agoVolume
        } else {
          pvs -= agoVolume
        }
      }
      result.push(vr)
    })
    return result
  }
}




},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => williamsR });
const $mod0 = $load(84);
const getMaxMin = $mod0.getMaxMin;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */












/**
 * WR
 * 公式 WR(N) = 100 * [ C - HIGH(N) ] / [ HIGH(N)-LOW(N) ]
 */
const williamsR                        = {
  name: 'WR',
  shortName: 'WR',
  calcParams: [6, 10, 14],
  figures: [
    { key: 'wr1', title: 'WR1: ', type: 'line' },
    { key: 'wr2', title: 'WR2: ', type: 'line' },
    { key: 'wr3', title: 'WR3: ', type: 'line' }
  ],
  regenerateFigures: (params       ) => {
    return params.map((_, i        ) => {
      return { key: `wr${i + 1}`, title: `WR${i + 1}: `, type: 'line' }
    })
  },
  calc: (dataList             , indicator               ) => {
    const { calcParams: params, figures } = indicator
    return dataList.map((kLineData, i) => {
      const wr     = {}
      const close = kLineData.close
      params.forEach((param, index) => {
        const p = param - 1
        if (i >= p) {
          const hln = getMaxMin           (dataList.slice(i - p, i + 1), 'high', 'low')
          const hn = hln[0]
          const ln = hln[1]
          const hnSubLn = hn - ln
          wr[figures[index].key] = hnSubLn === 0 ? 0 : (close - hn) / hnSubLn * 100
        }
      })
      return wr
    })
  }
}




},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => fibonacciLine });
const $mod0 = $load(81);
const formatThousands = $mod0.formatThousands;
const formatFoldDecimal = $mod0.formatFoldDecimal;
const $mod3 = $load(87);
const isNumber = $mod3.isNumber;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */









const fibonacciLine                  = {
  name: 'fibonacciLine',
  totalStep: 3,
  needDefaultPointFigure: true,
  needDefaultXAxisFigure: true,
  needDefaultYAxisFigure: true,
  createPointFigures: ({ coordinates, bounding, overlay, precision, thousandsSeparator, decimalFoldThreshold, yAxis }) => {
    const points = overlay.points
    if (coordinates.length > 0) {
      const currentPrecision = (yAxis?.isInCandle() ?? true) ? precision.price : precision.excludePriceVolumeMax
      const lines              = []
      const texts              = []
      const startX = 0
      const endX = bounding.width
      if (coordinates.length > 1 && isNumber(points[0].value) && isNumber(points[1].value)) {
        const percents = [1, 0.786, 0.618, 0.5, 0.382, 0.236, 0]
        const yDif = coordinates[0].y - coordinates[1].y
        const valueDif = points[0].value - points[1].value
        percents.forEach(percent => {
          const y = coordinates[1].y + yDif * percent
          const value = formatFoldDecimal(formatThousands(((points[1].value ?? 0) + valueDif * percent).toFixed(currentPrecision), thousandsSeparator), decimalFoldThreshold)
          lines.push({ coordinates: [{ x: startX, y }, { x: endX, y }] })
          texts.push({
            x: startX,
            y,
            text: `${value} (${(percent * 100).toFixed(1)}%)`,
            baseline: 'bottom'
          })
        })
      }
      return [
        {
          type: 'line',
          attrs: lines
        }, {
          type: 'text',
          isCheckEvent: false,
          attrs: texts
        }
      ]
    }
    return []
  }
}




},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => horizontalRayLine });
const $mod0 = $load(87);
const isValid = $mod0.isValid;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */




const horizontalRayLine                  = {
  name: 'horizontalRayLine',
  totalStep: 3,
  needDefaultPointFigure: true,
  needDefaultXAxisFigure: true,
  needDefaultYAxisFigure: true,
  createPointFigures: ({ coordinates, bounding }) => {
    const coordinate = { x: 0, y: coordinates[0].y }
    if (isValid(coordinates[1]) && coordinates[0].x < coordinates[1].x) {
      coordinate.x = bounding.width
    }
    return [
      {
        type: 'line',
        attrs: { coordinates: [coordinates[0], coordinate] }
      }
    ]
  },
  performEventPressedMove: ({ points, performPoint }) => {
    points[0].value = performPoint.value
    points[1].value = performPoint.value
  },
  performEventMoveForDrawing: ({ currentStep, points, performPoint }) => {
    if (currentStep === 2) {
      points[0].value = performPoint.value
    }
  }
}




},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => horizontalSegment });

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */





const horizontalSegment                  = {
  name: 'horizontalSegment',
  totalStep: 3,
  needDefaultPointFigure: true,
  needDefaultXAxisFigure: true,
  needDefaultYAxisFigure: true,
  createPointFigures: ({ coordinates }) => {
    const lines              = []
    if (coordinates.length === 2) {
      lines.push({ coordinates })
    }
    return [
      {
        type: 'line',
        attrs: lines
      }
    ]
  },
  performEventPressedMove: ({ points, performPoint }) => {
    points[0].value = performPoint.value
    points[1].value = performPoint.value
  },
  performEventMoveForDrawing: ({ currentStep, points, performPoint }) => {
    if (currentStep === 2) {
      points[0].value = performPoint.value
    }
  }
}




},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => horizontalStraightLine });

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */



const horizontalStraightLine                  = {
  name: 'horizontalStraightLine',
  totalStep: 2,
  needDefaultPointFigure: true,
  needDefaultXAxisFigure: true,
  needDefaultYAxisFigure: true,
  createPointFigures: ({ coordinates, bounding }) => {
    return [{
      type: 'line',
      attrs: {
        coordinates: [
          {
            x: 0,
            y: coordinates[0].y
          }, {
            x: bounding.width,
            y: coordinates[0].y
          }
        ]
      }
    }]
  }
}




},
function ($exports, $load) {
Object.defineProperty($exports, "registerOverlay", { enumerable: true, get: () => registerOverlay });
Object.defineProperty($exports, "getOverlayClass", { enumerable: true, get: () => getOverlayClass });
Object.defineProperty($exports, "getOverlayInnerClass", { enumerable: true, get: () => getOverlayInnerClass });
Object.defineProperty($exports, "getSupportedOverlays", { enumerable: true, get: () => getSupportedOverlays });
const $mod0 = $load(32);
const OverlayImp = $mod0.default;
const $mod2 = $load(127);
const fibonacciLine = $mod2.default;
const $mod4 = $load(128);
const horizontalRayLine = $mod4.default;
const $mod6 = $load(129);
const horizontalSegment = $mod6.default;
const $mod8 = $load(130);
const horizontalStraightLine = $mod8.default;
const $mod10 = $load(132);
const parallelStraightLine = $mod10.default;
const $mod12 = $load(133);
const priceChannelLine = $mod12.default;
const $mod14 = $load(134);
const priceLine = $mod14.default;
const $mod16 = $load(135);
const rayLine = $mod16.default;
const $mod18 = $load(136);
const segment = $mod18.default;
const $mod20 = $load(139);
const straightLine = $mod20.default;
const $mod22 = $load(140);
const verticalRayLine = $mod22.default;
const $mod24 = $load(141);
const verticalSegment = $mod24.default;
const $mod26 = $load(142);
const verticalStraightLine = $mod26.default;
const $mod28 = $load(137);
const simpleAnnotation = $mod28.default;
const $mod30 = $load(138);
const simpleTag = $mod30.default;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */






















const overlays                                          = {}

const extensions = [
  fibonacciLine, horizontalRayLine, horizontalSegment, horizontalStraightLine,
  parallelStraightLine, priceChannelLine, priceLine, rayLine, segment,
  straightLine, verticalRayLine, verticalSegment, verticalStraightLine,
  simpleAnnotation, simpleTag
]

extensions.forEach((template                 ) => {
  overlays[template.name] = OverlayImp.extend(template)
})

function registerOverlay (template                 )       {
  overlays[template.name] = OverlayImp.extend(template)
}

function getOverlayInnerClass (name        )                                    {
  return overlays[name] ?? null
}

function getOverlayClass (name        )                               {
  return overlays[name] ?? null
}

function getSupportedOverlays ()           {
  return Object.keys(overlays)
}




},
function ($exports, $load) {
Object.defineProperty($exports, "getParallelLines", { enumerable: true, get: () => getParallelLines });
Object.defineProperty($exports, "default", { enumerable: true, get: () => parallelStraightLine });
const $mod0 = $load(91);
const getLinearSlopeIntercept = $mod0.getLinearSlopeIntercept;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */








/**
 * 获取平行线
 * @param coordinates
 * @param bounding
 * @param extendParallelLineCount
 * @returns {Array}
 */
function getParallelLines (coordinates              , bounding          , extendParallelLineCount         )              {
  const count = extendParallelLineCount ?? 0
  const lines              = []
  if (coordinates.length > 1) {
    if (coordinates[0].x === coordinates[1].x) {
      const startY = 0
      const endY = bounding.height
      lines.push({ coordinates: [{ x: coordinates[0].x, y: startY }, { x: coordinates[0].x, y: endY }] })
      if (coordinates.length > 2) {
        lines.push({ coordinates: [{ x: coordinates[2].x, y: startY }, { x: coordinates[2].x, y: endY }] })
        const distance = coordinates[0].x - coordinates[2].x
        for (let i = 0; i < count; i++) {
          const d = distance * (i + 1)
          lines.push({ coordinates: [{ x: coordinates[0].x + d, y: startY }, { x: coordinates[0].x + d, y: endY }] })
        }
      }
    } else {
      const startX = 0
      const endX = bounding.width
      const kb = getLinearSlopeIntercept(coordinates[0], coordinates[1])
      const k = kb[0]
      const b = kb[1]
      lines.push({ coordinates: [{ x: startX, y: startX * k + b }, { x: endX, y: endX * k + b }] })
      if (coordinates.length > 2) {
        const b1 = coordinates[2].y - k * coordinates[2].x
        lines.push({ coordinates: [{ x: startX, y: startX * k + b1 }, { x: endX, y: endX * k + b1 }] })
        const distance = b - b1
        for (let i = 0; i < count; i++) {
          const b2 = b + distance * (i + 1)
          lines.push({ coordinates: [{ x: startX, y: startX * k + b2 }, { x: endX, y: endX * k + b2 }] })
        }
      }
    }
  }
  return lines
}

const parallelStraightLine                  = {
  name: 'parallelStraightLine',
  totalStep: 4,
  needDefaultPointFigure: true,
  needDefaultXAxisFigure: true,
  needDefaultYAxisFigure: true,
  createPointFigures: ({ coordinates, bounding }) => {
    return [
      {
        type: 'line',
        attrs: getParallelLines(coordinates, bounding)
      }
    ]
  }
}




},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => priceChannelLine });
const $mod0 = $load(132);
const getParallelLines = $mod0.getParallelLines;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */





const priceChannelLine                  = {
  name: 'priceChannelLine',
  totalStep: 4,
  needDefaultPointFigure: true,
  needDefaultXAxisFigure: true,
  needDefaultYAxisFigure: true,
  createPointFigures: ({ coordinates, bounding }) => {
    return [
      {
        type: 'line',
        attrs: getParallelLines(coordinates, bounding, 1)
      }
    ]
  }
}




},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => priceLine });
const $mod0 = $load(81);
const formatThousands = $mod0.formatThousands;
const formatFoldDecimal = $mod0.formatFoldDecimal;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */





const priceLine                  = {
  name: 'priceLine',
  totalStep: 2,
  needDefaultPointFigure: true,
  needDefaultXAxisFigure: true,
  needDefaultYAxisFigure: true,
  createPointFigures: ({ coordinates, bounding, precision, overlay, thousandsSeparator, decimalFoldThreshold, yAxis }) => {
    const { value = 0 } = (overlay.points)[0]
    const currentPrecision = (yAxis?.isInCandle() ?? true) ? precision.price : precision.excludePriceVolumeMax
    return [
      {
        type: 'line',
        attrs: { coordinates: [coordinates[0], { x: bounding.width, y: coordinates[0].y }] }
      },
      {
        type: 'text',
        ignoreEvent: true,
        attrs: {
          x: coordinates[0].x,
          y: coordinates[0].y,
          text: formatFoldDecimal(formatThousands(value.toFixed(currentPrecision), thousandsSeparator), decimalFoldThreshold),
          baseline: 'bottom'
        }
      }
    ]
  }
}




},
function ($exports, $load) {
Object.defineProperty($exports, "getRayLine", { enumerable: true, get: () => getRayLine });
Object.defineProperty($exports, "default", { enumerable: true, get: () => rayLine });
const $mod0 = $load(91);
const getLinearYFromCoordinates = $mod0.getLinearYFromCoordinates;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */








function getRayLine (coordinates              , bounding          )                          {
  if (coordinates.length > 1) {
    let coordinate
    if (coordinates[0].x === coordinates[1].x && coordinates[0].y !== coordinates[1].y) {
      if (coordinates[0].y < coordinates[1].y) {
        coordinate = {
          x: coordinates[0].x,
          y: bounding.height
        }
      } else {
        coordinate = {
          x: coordinates[0].x,
          y: 0
        }
      }
    } else if (coordinates[0].x > coordinates[1].x) {
      coordinate = {
        x: 0,
        y: getLinearYFromCoordinates(coordinates[0], coordinates[1], { x: 0, y: coordinates[0].y })
      }
    } else {
      coordinate = {
        x: bounding.width,
        y: getLinearYFromCoordinates(coordinates[0], coordinates[1], { x: bounding.width, y: coordinates[0].y })
      }
    }
    return { coordinates: [coordinates[0], coordinate] }
  }
  return []
}

const rayLine                  = {
  name: 'rayLine',
  totalStep: 3,
  needDefaultPointFigure: true,
  needDefaultXAxisFigure: true,
  needDefaultYAxisFigure: true,
  createPointFigures: ({ coordinates, bounding }) => {
    return [
      {
        type: 'line',
        attrs: getRayLine(coordinates, bounding)
      }
    ]
  }
}




},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => segment });

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */



const segment                  = {
  name: 'segment',
  totalStep: 3,
  needDefaultPointFigure: true,
  needDefaultXAxisFigure: true,
  needDefaultYAxisFigure: true,
  createPointFigures: ({ coordinates }) => {
    if (coordinates.length === 2) {
      return [
        {
          type: 'line',
          attrs: { coordinates }
        }
      ]
    }
    return []
  }
}




},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => simpleAnnotation });
const $mod0 = $load(87);
const isFunction = $mod0.isFunction;
const isValid = $mod0.isValid;
const $mod3 = $load(23);
const LineType = $mod3.LineType;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */





const simpleAnnotation                  = {
  name: 'simpleAnnotation',
  totalStep: 2,
  styles: {
    line: { style: LineType.Dashed }
  },
  createPointFigures: ({ overlay, coordinates }) => {
    let text
    if (isValid(overlay.extendData)) {
      if (!isFunction(overlay.extendData)) {
        text = overlay.extendData ?? ''
      } else {
        text = overlay.extendData(overlay)
      }
    }
    const startX = coordinates[0].x
    const startY = coordinates[0].y - 6
    const lineEndY = startY - 50
    const arrowEndY = lineEndY - 5
    return [
      {
        type: 'line',
        attrs: { coordinates: [{ x: startX, y: startY }, { x: startX, y: lineEndY }] },
        ignoreEvent: true
      },
      {
        type: 'polygon',
        attrs: { coordinates: [{ x: startX, y: lineEndY }, { x: startX - 4, y: arrowEndY }, { x: startX + 4, y: arrowEndY }] },
        ignoreEvent: true
      },
      {
        type: 'text',
        attrs: { x: startX, y: arrowEndY, text: text ?? '', align: 'center', baseline: 'bottom' },
        ignoreEvent: true
      }
    ]
  }
}




},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => simpleTag });
const $mod0 = $load(81);
const formatPrecision = $mod0.formatPrecision;
const $mod2 = $load(87);
const isFunction = $mod2.isFunction;
const isNumber = $mod2.isNumber;
const isValid = $mod2.isValid;
const $mod6 = $load(23);
const LineType = $mod6.LineType;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */









const simpleTag                  = {
  name: 'simpleTag',
  totalStep: 2,
  styles: {
    line: { style: LineType.Dashed }
  },
  createPointFigures: ({ bounding, coordinates }) => {
    return {
      type: 'line',
      attrs: {
        coordinates: [
          { x: 0, y: coordinates[0].y },
          { x: bounding.width, y: coordinates[0].y }
        ]
      },
      ignoreEvent: true
    }
  },
  createYAxisFigures: ({ overlay, coordinates, bounding, yAxis, precision }) => {
    const isFromZero = yAxis?.isFromZero() ?? false
    let textAlign
    let x
    if (isFromZero) {
      textAlign = 'left'
      x = 0
    } else {
      textAlign = 'right'
      x = bounding.width
    }
    let text
    if (isValid(overlay.extendData)) {
      if (!isFunction(overlay.extendData)) {
        text = overlay.extendData ?? ''
      } else {
        text = overlay.extendData(overlay)
      }
    }
    if (!isValid(text) && isNumber(overlay.points[0].value)) {
      text = formatPrecision(overlay.points[0].value, precision.price)
    }
    return { type: 'text', attrs: { x, y: coordinates[0].y, text: text ?? '', align: textAlign, baseline: 'middle' } }
  }
}




},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => straightLine });
const $mod0 = $load(91);
const getLinearYFromCoordinates = $mod0.getLinearYFromCoordinates;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */





const straightLine                  = {
  name: 'straightLine',
  totalStep: 3,
  needDefaultPointFigure: true,
  needDefaultXAxisFigure: true,
  needDefaultYAxisFigure: true,
  createPointFigures: ({ coordinates, bounding }) => {
    if (coordinates.length === 2) {
      if (coordinates[0].x === coordinates[1].x) {
        return [
          {
            type: 'line',
            attrs: {
              coordinates: [
                {
                  x: coordinates[0].x,
                  y: 0
                }, {
                  x: coordinates[0].x,
                  y: bounding.height
                }
              ]
            }
          }
        ]
      }
      return [
        {
          type: 'line',
          attrs: {
            coordinates: [
              {
                x: 0,
                y: getLinearYFromCoordinates(coordinates[0], coordinates[1], { x: 0, y: coordinates[0].y })
              }, {
                x: bounding.width,
                y: getLinearYFromCoordinates(coordinates[0], coordinates[1], { x: bounding.width, y: coordinates[0].y })
              }
            ]
          }
        }
      ]
    }
    return []
  }
}




},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => verticalRayLine });

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */



const verticalRayLine                  = {
  name: 'verticalRayLine',
  totalStep: 3,
  needDefaultPointFigure: true,
  needDefaultXAxisFigure: true,
  needDefaultYAxisFigure: true,
  createPointFigures: ({ coordinates, bounding }) => {
    if (coordinates.length === 2) {
      const coordinate = { x: coordinates[0].x, y: 0 }
      if (coordinates[0].y < coordinates[1].y) {
        coordinate.y = bounding.height
      }
      return [
        {
          type: 'line',
          attrs: { coordinates: [coordinates[0], coordinate] }
        }
      ]
    }
    return []
  },
  performEventPressedMove: ({ points, performPoint }) => {
    points[0].timestamp = performPoint.timestamp
    points[0].dataIndex = performPoint.dataIndex
    points[1].timestamp = performPoint.timestamp
    points[1].dataIndex = performPoint.dataIndex
  },
  performEventMoveForDrawing: ({ currentStep, points, performPoint }) => {
    if (currentStep === 2) {
      points[0].timestamp = performPoint.timestamp
      points[0].dataIndex = performPoint.dataIndex
    }
  }
}




},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => verticalSegment });

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */



const verticalSegment                  = {
  name: 'verticalSegment',
  totalStep: 3,
  needDefaultPointFigure: true,
  needDefaultXAxisFigure: true,
  needDefaultYAxisFigure: true,
  createPointFigures: ({ coordinates }) => {
    if (coordinates.length === 2) {
      return [
        {
          type: 'line',
          attrs: { coordinates }
        }
      ]
    }
    return []
  },
  performEventPressedMove: ({ points, performPoint }) => {
    points[0].timestamp = performPoint.timestamp
    points[0].dataIndex = performPoint.dataIndex
    points[1].timestamp = performPoint.timestamp
    points[1].dataIndex = performPoint.dataIndex
  },
  performEventMoveForDrawing: ({ currentStep, points, performPoint }) => {
    if (currentStep === 2) {
      points[0].timestamp = performPoint.timestamp
      points[0].dataIndex = performPoint.dataIndex
    }
  }
}




},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => verticalStraightLine });

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */



const verticalStraightLine                  = {
  name: 'verticalStraightLine',
  totalStep: 2,
  needDefaultPointFigure: true,
  needDefaultXAxisFigure: true,
  needDefaultYAxisFigure: true,
  createPointFigures: ({ coordinates, bounding }) => {
    return [
      {
        type: 'line',
        attrs: {
          coordinates: [
            {
              x: coordinates[0].x,
              y: 0
            }, {
              x: coordinates[0].x,
              y: bounding.height
            }
          ]
        }
      }
    ]
  }
}




},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => dark });

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */




const dark                      = {
  grid: {
    horizontal: {
      color: '#292929'
    },
    vertical: {
      color: '#292929'
    }
  },
  candle: {
    priceMark: {
      high: {
        color: '#929AA5'
      },
      low: {
        color: '#929AA5'
      }
    },
    tooltip: {
      rect: {
        color: 'rgba(10, 10, 10, .6)',
        borderColor: 'rgba(10, 10, 10, .6)'
      },
      text: {
        color: '#929AA5'
      }
    }
  },
  indicator: {
    tooltip: {
      text: {
        color: '#929AA5'
      }
    }
  },
  xAxis: {
    axisLine: {
      color: '#333333'
    },
    tickText: {
      color: '#929AA5'
    },
    tickLine: {
      color: '#333333'
    }
  },
  yAxis: {
    axisLine: {
      color: '#333333'
    },
    tickText: {
      color: '#929AA5'
    },
    tickLine: {
      color: '#333333'
    }
  },
  separator: {
    color: '#333333'
  },
  crosshair: {
    horizontal: {
      line: {
        color: '#929AA5'
      },
      text: {
        borderColor: '#373a40',
        backgroundColor: '#373a40'
      }
    },
    vertical: {
      line: {
        color: '#929AA5'
      },
      text: {
        borderColor: '#373a40',
        backgroundColor: '#373a40'
      }
    }
  }
}




},
function ($exports, $load) {
Object.defineProperty($exports, "registerStyles", { enumerable: true, get: () => registerStyles });
Object.defineProperty($exports, "getStyles", { enumerable: true, get: () => getStyles });
const $mod0 = $load(145);
const light = $mod0.default;
const $mod2 = $load(143);
const dark = $mod2.default;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */








const styles                                      = {
  light,
  dark
}

function registerStyles (name        , ss                     )       {
  styles[name] = ss
}

function getStyles (name        )                                {
  return styles[name] ?? null
}




},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => light });

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */




const light                      = {
  grid: {
    horizontal: {
      color: '#EDEDED'
    },
    vertical: {
      color: '#EDEDED'
    }
  },
  candle: {
    priceMark: {
      high: {
        color: '#76808F'
      },
      low: {
        color: '#76808F'
      }
    },
    tooltip: {
      rect: {
        color: '#FEFEFE',
        borderColor: '#F2F3F5'
      },
      text: {
        color: '#76808F'
      }
    }
  },
  indicator: {
    tooltip: {
      text: {
        color: '#76808F'
      }
    }
  },
  xAxis: {
    axisLine: {
      color: '#DDDDDD'
    },
    tickText: {
      color: '#76808F'
    },
    tickLine: {
      color: '#DDDDDD'
    }
  },
  yAxis: {
    axisLine: {
      color: '#DDDDDD'
    },
    tickText: {
      color: '#76808F'
    },
    tickLine: {
      color: '#DDDDDD'
    }
  },
  separator: {
    color: '#DDDDDD'
  },
  crosshair: {
    horizontal: {
      line: {
        color: '#76808F'
      },
      text: {
        borderColor: '#686D76',
        backgroundColor: '#686D76'
      }
    },
    vertical: {
      line: {
        color: '#76808F'
      },
      text: {
        borderColor: '#686D76',
        backgroundColor: '#686D76'
      }
    }
  }
}




},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => defaultXAxis });

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */



const defaultXAxis               = {
  name: 'default',
  createTicks: ({ defaultTicks }) => defaultTicks
}




},
function ($exports, $load) {
Object.defineProperty($exports, "registerXAxis", { enumerable: true, get: () => registerXAxis });
Object.defineProperty($exports, "getXAxisClass", { enumerable: true, get: () => getXAxisClass });
const $mod0 = $load(33);
const XAxisImp = $mod0.default;
const $mod2 = $load(146);
const defaultXAxis = $mod2.default;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */






const xAxises                                   = {
  default: XAxisImp.extend(defaultXAxis)
}

function registerXAxis (axis              )       {
  xAxises[axis.name] = XAxisImp.extend(axis)
}

function getXAxisClass (name        )                   {
  return xAxises[name] ?? xAxises.default
}




},
function ($exports, $load) {
Object.defineProperty($exports, "default", { enumerable: true, get: () => defaultYAxis });

/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */



const defaultYAxis               = {
  name: 'default',
  createTicks: ({ defaultTicks }) => defaultTicks
}




},
function ($exports, $load) {
Object.defineProperty($exports, "registerYAxis", { enumerable: true, get: () => registerYAxis });
Object.defineProperty($exports, "getYAxisClass", { enumerable: true, get: () => getYAxisClass });
const $mod0 = $load(34);
const YAxisImp = $mod0.default;
const $mod2 = $load(148);
const defaultYAxis = $mod2.default;
/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */






const yAxises                                   = {
  default: YAxisImp.extend(defaultYAxis)
}

function registerYAxis (axis              )       {
  yAxises[axis.name] = YAxisImp.extend(axis)
}

function getYAxisClass (name        )                   {
  return yAxises[name] ?? yAxises.default
}




}
  ];
  function load(id) {
    if (cache[id]) return cache[id];
    const exports = cache[id] = {};
    modules[id](exports, load);
    return exports;
  }
  global.klinecharts = load(2);
})(globalThis);
