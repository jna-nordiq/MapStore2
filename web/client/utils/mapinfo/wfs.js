/**
 * Copyright 2017, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {Observable} from 'rxjs';

import {normalizeSRS} from '../CoordinatesUtils';
import { getLayerUrl } from '../LayersUtils';
import { isObject } from 'lodash';
import { optionsToVendorParams } from '../VendorParamsUtils';
import { describeFeatureType, getFeature } from '../../api/WFS';
import { extractGeometryAttributeName } from '../WFSLayerUtils';


import {addAuthenticationToSLD, getAuthorizationBasic} from '../SecurityUtils';

// if the url uses following constant means the whole workflow is managed client side
// and prevent request to a service
const CLIENT_WORKFLOW = 'client';

/**
 * Creates the request object and it's metadata for WFS GetFeature to simulate GetFeatureInfo.
 * @param {object} layer
 * @param {object} options
 * @param {string} infoFormat
 * @param {string} viewer
 * @return {object} an object with `request`, containing request params, `metadata` with some info about the layer and the request, and `url` to send the request to.
 */
const buildRequest = (layer, { map = {}, point, currentLocale, params, maxItems = 10 } = {}, infoFormat, viewer, featureInfo) => {
    if (point?.intersectedFeatures) {
        const { features = [] } = point?.intersectedFeatures?.find(({ id }) => id === layer.id) || {};
        const isRemote = infoFormat === 'text/html';
        return {
            request: {
                features: [...features],
                outputFormat: isRemote ? 'text/html' : 'application/json'
            },
            metadata: {
                title: isObject(layer.title)
                    ? layer.title[currentLocale] || layer.title.default
                    : layer.title,
                regex: layer.featureInfoRegex,
                fields: layer.fields,
                viewer,
                featureInfo
            },
            url: isRemote ? layer.url : CLIENT_WORKFLOW
        };
    }
    /* In order to create a valid feature info request
     * we create a bbox of 101x101 pixel that wrap the point.
     * center point is re-projected then is built a box of 101x101pixel around it
     */
    return {
        request: addAuthenticationToSLD({
            point, // THIS WILL NOT BE PASSED TO FINAL REQUEST, BUT USED IN getRetrieveFlow
            service: 'WFS',
            version: '1.1.1',
            request: 'GetFeature',
            outputFormat: 'application/json',
            exceptions: 'application/json',
            id: layer.id,
            typeName: layer.name,
            srs: normalizeSRS(map.projection) || 'EPSG:4326',
            feature_count: maxItems,
            ...Object.assign({ params })
        }, layer),
        metadata: {
            title: isObject(layer.title) ? layer.title[currentLocale] || layer.title.default : layer.title,
            regex: layer.featureInfoRegex,
            viewer,
            featureInfo
        },
        url: getLayerUrl(layer).replace(/[?].*$/g, '')
    };
};


const getIdentifyGeometry = point => {
    const geometry = point?.geometricFilter?.value?.geometry;
    if (geometry) {
        return geometry;
    }
    // Create a simple point filter if the geometryFilter (typically an emulation of the feature info click filter) is not present.
    let wrongLng = point.latlng.lng;
    // longitude restricted to the [-180°,+180°] range
    let lngCorrected = wrongLng - 360 * Math.floor(wrongLng / 360 + 0.5);
    return {
        coordinates: [lngCorrected, point.latlng.lat],
        projection: "EPSG:4326",
        type: "Point"
    };
};

export default {
    buildRequest,
    getIdentifyFlow: (layer = {}, baseURL, defaultParams) => {
        const headers = getAuthorizationBasic(layer?.security?.sourceId);
        const { point, features, ...baseParams } = defaultParams || {};
        if (features) {
            if (baseURL && baseURL !== CLIENT_WORKFLOW) {
                const filterIdsCQL = `IN (${features.map(feature => `'${feature.id}'`).join(',')})`;
                const params = optionsToVendorParams({
                    layerFilter: layer?.layerFilter,
                    params: {
                        ...layer.baseParams,
                        ...layer.params,
                        ...baseParams
                    }
                }, filterIdsCQL);
                return Observable.defer(() => getFeature(baseURL, layer.name, params, {headers}));
            }
            return Observable.of({
                data: {
                    features
                }
            });
        }
        const geometry = getIdentifyGeometry(point);
        return Observable.defer( () => describeFeatureType(layer.url, layer.name) // TODO: cache this
            .then(describe => {
                const attribute = extractGeometryAttributeName(describe);
                const params = optionsToVendorParams({
                    layerFilter: layer.layerFilter,
                    filterObj: {
                        spatialField: {
                            attribute,
                            operation: "INTERSECTS",
                            geometry: geometry
                        }

                    },
                    params: Object.assign({}, layer.baseParams, layer.params, baseParams)
                });
                return getFeature(baseURL, layer.name, params, {headers});
            }));
    }};
