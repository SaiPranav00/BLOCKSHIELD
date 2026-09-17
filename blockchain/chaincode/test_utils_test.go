package main

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/golang/protobuf/ptypes/timestamp"
	"github.com/hyperledger/fabric-chaincode-go/pkg/cid"
	"github.com/hyperledger/fabric-chaincode-go/shim"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
	"github.com/hyperledger/fabric-protos-go/ledger/queryresult"
)

// MockTransactionContext implements contractapi.TransactionContextInterface for unit tests
type MockTransactionContext struct {
	contractapi.TransactionContext
	mockStub           *MockChaincodeStub
	mockClientIdentity *MockClientIdentity
}

func (m *MockTransactionContext) GetStub() shim.ChaincodeStubInterface {
	return m.mockStub
}

func (m *MockTransactionContext) GetClientIdentity() cid.ClientIdentity {
	return m.mockClientIdentity
}

// MockClientIdentity implements minimal client identity for testing
type MockClientIdentity struct {
	cid.ClientIdentity
	id string
}

func (m *MockClientIdentity) GetID() (string, error) {
	if m.id == "" {
		return "e2e_mock_client_id", nil
	}
	return m.id, nil
}

// MockChaincodeStub implements shim.ChaincodeStubInterface for unit tests
type MockChaincodeStub struct {
	shim.ChaincodeStubInterface
	state   map[string][]byte
	txID    string
	counter int64
}

func NewMockChaincodeStub() *MockChaincodeStub {
	return &MockChaincodeStub{
		state: make(map[string][]byte),
		txID:  "tx_mock",
	}
}

func (m *MockChaincodeStub) PutState(key string, value []byte) error {
	m.state[key] = value
	return nil
}

func (m *MockChaincodeStub) GetState(key string) ([]byte, error) {
	val, ok := m.state[key]
	if !ok {
		return nil, nil
	}
	return val, nil
}

func (m *MockChaincodeStub) GetTxID() string {
	m.counter++
	return fmt.Sprintf("%s_%d_%d", m.txID, time.Now().UnixNano(), m.counter)
}

func (m *MockChaincodeStub) GetTxTimestamp() (*timestamp.Timestamp, error) {
	now := time.Now()
	return &timestamp.Timestamp{
		Seconds: now.Unix(),
		Nanos:   int32(now.Nanosecond()),
	}, nil
}

type MockStateQueryIterator struct {
	items []*queryresult.KV
	index int
}

func (m *MockStateQueryIterator) HasNext() bool {
	return m.index < len(m.items)
}

func (m *MockStateQueryIterator) Next() (*queryresult.KV, error) {
	if !m.HasNext() {
		return nil, nil
	}
	item := m.items[m.index]
	m.index++
	return item, nil
}

func (m *MockStateQueryIterator) Close() error {
	return nil
}

func (m *MockChaincodeStub) GetQueryResult(query string) (shim.StateQueryIteratorInterface, error) {
	var items []*queryresult.KV

	type SelectorQuery struct {
		Selector map[string]string `json:"selector"`
	}

	var parsedQuery SelectorQuery
	_ = json.Unmarshal([]byte(query), &parsedQuery)
	docType := parsedQuery.Selector["docType"]
	ownerDID := parsedQuery.Selector["ownerDID"]
	resourceId := parsedQuery.Selector["resourceId"]

	for k, v := range m.state {
		var doc map[string]interface{}
		if err := json.Unmarshal(v, &doc); err == nil {
			matchDocType := docType == "" || doc["docType"] == docType
			matchOwner := ownerDID == "" || doc["ownerDID"] == ownerDID
			matchResource := resourceId == "" || doc["resourceId"] == resourceId

			if matchDocType && matchOwner && matchResource {
				items = append(items, &queryresult.KV{
					Key:   k,
					Value: v,
				})
			}
		}
	}

	return &MockStateQueryIterator{items: items, index: 0}, nil
}

func (m *MockChaincodeStub) GetStateByRange(startKey, endKey string) (shim.StateQueryIteratorInterface, error) {
	var items []*queryresult.KV
	prefix := strings.TrimRight(startKey, "\uffff")

	for k, v := range m.state {
		if strings.HasPrefix(k, prefix) {
			items = append(items, &queryresult.KV{
				Key:   k,
				Value: v,
			})
		}
	}

	return &MockStateQueryIterator{items: items, index: 0}, nil
}

type MockHistoryQueryIterator struct {
	items []*queryresult.KeyModification
	index int
}

func (m *MockHistoryQueryIterator) HasNext() bool {
	return m.index < len(m.items)
}

func (m *MockHistoryQueryIterator) Next() (*queryresult.KeyModification, error) {
	if !m.HasNext() {
		return nil, nil
	}
	item := m.items[m.index]
	m.index++
	return item, nil
}

func (m *MockHistoryQueryIterator) Close() error {
	return nil
}

func (m *MockChaincodeStub) GetHistoryForKey(key string) (shim.HistoryQueryIteratorInterface, error) {
	val, ok := m.state[key]
	var items []*queryresult.KeyModification
	if ok {
		items = append(items, &queryresult.KeyModification{
			TxId:      m.txID,
			Value:     val,
			Timestamp: &timestamp.Timestamp{Seconds: time.Now().Unix()},
			IsDelete:  false,
		})
	}

	return &MockHistoryQueryIterator{items: items, index: 0}, nil
}

func SetupTestContext() (*SmartContract, *MockTransactionContext) {
	contract := new(SmartContract)
	stub := NewMockChaincodeStub()
	ctx := &MockTransactionContext{
		mockStub:           stub,
		mockClientIdentity: &MockClientIdentity{id: "admin_client_id"},
	}
	return contract, ctx
}
